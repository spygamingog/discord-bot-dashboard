import { getSupabaseServer } from './supabaseServer';

export interface IngestResult {
  success: boolean;
  project: string;
  source: 'github' | 'modrinth';
  documentsParsed: number;
  chunksCreated: number;
  details: string[];
  error?: string;
}

// Generate 768-dim embedding via Gemini
export async function getDocumentEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[projectIngestor] GEMINI_API_KEY is not set!');
    return null;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-2-preview',
          content: { parts: [{ text }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: 768,
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error('[projectIngestor] Gemini embed error:', res.status, errText);
      return null;
    }
    const data = await res.json();
    return data.embedding?.values || null;
  } catch (err) {
    console.error('[projectIngestor] Gemini embed exception:', err);
    return null;
  }
}

// Simple text chunker with configurable token/word size and overlap
export function chunkDocument(
  text: string,
  maxWords: number = 400,
  overlapWords: number = 50
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return [text];

  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const end = Math.min(i + maxWords, words.length);
    const slice = words.slice(i, end).join(' ');
    if (slice.trim()) chunks.push(slice.trim());
    if (end >= words.length) break;
    i += maxWords - overlapWords;
  }
  return chunks;
}

// Core Dynamic Project Ingestor & Synchronizer
export async function syncProject({
  target,
  source = 'github',
  isPrivate = false,
  githubToken,
}: {
  target: string;
  source?: 'github' | 'modrinth';
  isPrivate?: boolean;
  githubToken?: string;
}): Promise<IngestResult> {
  const supabase = getSupabaseServer();
  const input = target.trim();
  const details: string[] = [];

  const isModrinth = input.includes('modrinth.com') || source === 'modrinth';
  const isGitHub =
    input.includes('github.com') ||
    source === 'github' ||
    (!isModrinth && input.includes('/'));

  let projectName = '';
  let sourceType: 'github' | 'modrinth' = 'github';
  const documentsToIndex: Array<{
    title: string;
    content: string;
    version?: string;
    filePath?: string;
  }> = [];

  const ghToken = githubToken || process.env.GITHUB_TOKEN;

  // ==========================================
  // 1. GITHUB INGESTION & SCANNER
  // ==========================================
  if (isGitHub) {
    sourceType = 'github';
    const cleanRepo = input
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\/$/, '');
    projectName = cleanRepo.toLowerCase();

    const apiHeaders: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'DiscordBot-RAG-DynamicSync',
    };
    if (ghToken) {
      apiHeaders.Authorization = `Bearer ${ghToken}`;
    }

    // A. Fetch recent releases (up to 5)
    try {
      const relRes = await fetch(
        `https://api.github.com/repos/${cleanRepo}/releases?per_page=5`,
        { headers: apiHeaders }
      );

      if (relRes.ok) {
        const releases = await relRes.json();
        for (const rel of releases) {
          const version = rel.tag_name || rel.name || 'v1.0';
          const bodyText = (rel.body || '').trim();
          if (bodyText) {
            documentsToIndex.push({
              title: `${cleanRepo} Release ${rel.name || version}`,
              version,
              content: `# ${cleanRepo} - Release ${rel.name || version}\nPublished: ${rel.published_at}\n\n${bodyText}`,
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[syncProject] Could not fetch releases for ${cleanRepo}:`, err);
    }

    // B. Recursive Documentation Scan (All .md, .markdown, plugin.yml, config.yml via Git Trees API)
    try {
      let treeData: any = null;
      let defaultBranch = 'main';

      for (const branch of ['main', 'master']) {
        const treeRes = await fetch(
          `https://api.github.com/repos/${cleanRepo}/git/trees/${branch}?recursive=1`,
          { headers: apiHeaders }
        );
        if (treeRes.ok) {
          treeData = await treeRes.json();
          defaultBranch = branch;
          break;
        }
      }

      if (treeData && Array.isArray(treeData.tree)) {
        // Filter documentation and manifest blobs
        const docFiles = treeData.tree.filter(
          (f: any) =>
            f.type === 'blob' &&
            (f.path.endsWith('.md') ||
              f.path.endsWith('.markdown') ||
              f.path.endsWith('plugin.yml') ||
              f.path.endsWith('config.yml'))
        );

        console.log(
          `[syncProject] Discovered ${docFiles.length} documentation file(s) in ${cleanRepo}:`,
          docFiles.map((f: any) => f.path)
        );

        // Fetch each document (limit to top 25 files)
        for (const file of docFiles.slice(0, 25)) {
          try {
            const rawUrl = `https://raw.githubusercontent.com/${cleanRepo}/${defaultBranch}/${file.path}`;
            const fileRes = await fetch(rawUrl, {
              headers: ghToken ? { Authorization: `Bearer ${ghToken}` } : {},
            });

            if (fileRes.ok) {
              const content = await fileRes.text();
              if (content && content.trim().length > 15) {
                const isPluginYml = file.path.endsWith('plugin.yml');
                const docTitle = isPluginYml
                  ? `${cleanRepo} Commands & Permissions Manifest (${file.path})`
                  : `${cleanRepo} - ${file.path}`;

                documentsToIndex.push({
                  title: docTitle,
                  version: defaultBranch,
                  filePath: file.path,
                  content: `# ${cleanRepo}: ${file.path}\n\n${content}`,
                });
                details.push(`Found ${file.path}`);
              }
            }
          } catch (fileErr) {
            console.warn(`[syncProject] Could not fetch ${file.path}:`, fileErr);
          }
        }
      } else {
        // Fallback: Fetch README.md directly
        const readmeRes = await fetch(
          `https://api.github.com/repos/${cleanRepo}/readme`,
          { headers: { ...apiHeaders, Accept: 'application/vnd.github.raw' } }
        );
        if (readmeRes.ok) {
          const readmeText = await readmeRes.text();
          if (readmeText && readmeText.trim()) {
            documentsToIndex.push({
              title: `${cleanRepo} README & Documentation`,
              version: 'main',
              filePath: 'README.md',
              content: `# ${cleanRepo} - README.md\n\n${readmeText}`,
            });
            details.push('Found README.md');
          }
        }
      }
    } catch (err) {
      console.warn(`[syncProject] Documentation tree scan warning for ${cleanRepo}:`, err);
    }
  }

  // ==========================================
  // 2. MODRINTH INGESTION
  // ==========================================
  if (isModrinth) {
    sourceType = 'modrinth';
    const slug = input
      .replace(/^https?:\/\/modrinth\.com\/(plugin|mod)\//i, '')
      .replace(/\/$/, '');
    projectName = slug.toLowerCase();

    const projRes = await fetch(`https://api.modrinth.com/v2/project/${slug}`, {
      headers: { 'User-Agent': 'DiscordBot-RAG-DynamicSync' },
    });

    if (!projRes.ok) {
      return {
        success: false,
        project: projectName,
        source: 'modrinth',
        documentsParsed: 0,
        chunksCreated: 0,
        details,
        error: `Modrinth project not found: ${slug}`,
      };
    }

    const projData = await projRes.json();
    if (projData.body) {
      documentsToIndex.push({
        title: `${projData.title} Overview & Docs`,
        version: 'latest',
        filePath: 'overview',
        content: `# ${projData.title}\nDescription: ${projData.description}\n\n${projData.body}`,
      });
      details.push('Found Modrinth overview body');
    }

    // Fetch latest versions
    try {
      const verRes = await fetch(
        `https://api.modrinth.com/v2/project/${slug}/version`,
        { headers: { 'User-Agent': 'DiscordBot-RAG-DynamicSync' } }
      );
      if (verRes.ok) {
        const versions = await verRes.json();
        for (const ver of versions.slice(0, 4)) {
          if (ver.changelog) {
            documentsToIndex.push({
              title: `${projData.title} Version ${ver.version_number}`,
              version: ver.version_number,
              filePath: `changelog-${ver.version_number}`,
              content: `# ${projData.title} Changelog v${ver.version_number}\n\n${ver.changelog}`,
            });
          }
        }
      }
    } catch (err) {
      console.warn('[syncProject] Modrinth versions warning:', err);
    }
  }

  if (documentsToIndex.length === 0) {
    return {
      success: false,
      project: projectName,
      source: sourceType,
      documentsParsed: 0,
      chunksCreated: 0,
      details,
      error: `No documentation or markdown files could be found for ${projectName}.`,
    };
  }

  // ==========================================
  // 3. ATOMIC PURGE OF OUTDATED CHUNKS
  // ==========================================
  // Delete existing chunks for this project to cleanly replace edited files,
  // remove deleted docs, and prevent duplicate knowledge.
  console.log(`[syncProject] Purging outdated chunks for ${projectName}...`);
  await supabase
    .from('knowledge_chunks')
    .delete()
    .eq('project_name', projectName);

  // ==========================================
  // 4. CHUNK, EMBED & INSERT NEWEST CHUNKS
  // ==========================================
  let totalChunksCreated = 0;

  for (const doc of documentsToIndex) {
    const chunks = chunkDocument(doc.content, 400, 50);

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const embedding = await getDocumentEmbedding(chunkText);

      if (!embedding) {
        console.error(
          `[syncProject] Failed to generate 768-dim embedding for chunk ${i} of ${projectName}`
        );
        continue;
      }

      const { error: insErr } = await supabase.from('knowledge_chunks').insert({
        project_name: projectName,
        source_type: sourceType,
        content: chunkText,
        metadata: {
          title: doc.title,
          version: doc.version || '1.0.0',
          file_path: doc.filePath,
          chunk_index: i,
          ingested_at: new Date().toISOString(),
        },
        is_private: Boolean(isPrivate),
        embedding,
      });

      if (!insErr) {
        totalChunksCreated++;
      } else {
        console.error(
          `[syncProject] Supabase insert error for chunk ${i}:`,
          insErr.message
        );
      }
    }
  }

  return {
    success: totalChunksCreated > 0,
    project: projectName,
    source: sourceType,
    documentsParsed: documentsToIndex.length,
    chunksCreated: totalChunksCreated,
    details,
  };
}
