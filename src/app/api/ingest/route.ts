import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// Helper to generate 768-dim vector using Gemini
async function getDocumentEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set in environment!');
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
      console.error('Gemini embedContent error:', res.status, errText);
      return null;
    }
    const data = await res.json();
    return data.embedding?.values || null;
  } catch (err) {
    console.error('Gemini embed exception:', err);
    return null;
  }
}

// Simple text chunker for the API route
function chunkDocument(text: string, maxTokens: number = 400, overlapTokens: number = 50): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxTokens) return [text];

  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const end = Math.min(i + maxTokens, words.length);
    const slice = words.slice(i, end).join(' ');
    if (slice.trim()) chunks.push(slice.trim());
    if (end >= words.length) break;
    i += maxTokens - overlapTokens;
  }
  return chunks;
}

// GET: Actions (list_projects, list_github_repos)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'list_projects';

    // Action 1: List all distinct projects in memory
    if (action === 'list_projects') {
      const supabase = getSupabaseServer();
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .select('project_name, source_type, is_private, created_at');

      if (error) throw error;

      // Group projects
      const projectMap = new Map<string, {
        name: string;
        source_type: string;
        is_private: boolean;
        chunk_count: number;
        last_updated: string;
      }>();

      for (const row of data || []) {
        const existing = projectMap.get(row.project_name);
        if (!existing) {
          projectMap.set(row.project_name, {
            name: row.project_name,
            source_type: row.source_type || 'manual',
            is_private: Boolean(row.is_private),
            chunk_count: 1,
            last_updated: row.created_at,
          });
        } else {
          existing.chunk_count += 1;
          if (new Date(row.created_at) > new Date(existing.last_updated)) {
            existing.last_updated = row.created_at;
          }
        }
      }

      return NextResponse.json({
        success: true,
        projects: Array.from(projectMap.values()),
      });
    }

    // Action 2: List GitHub repositories (User, Organization, or Authenticated Account)
    if (action === 'list_github_repos') {
      const username = searchParams.get('username')?.trim();
      const token =
        searchParams.get('token')?.trim() ||
        req.headers.get('authorization')?.replace(/^bearer\s+/i, '') ||
        process.env.GITHUB_TOKEN;

      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DiscordBot-RAG-Dashboard',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let fetchUrl = '';

      // If token provided and user requested "me" or left blank
      if (token && (!username || username.toLowerCase() === 'me' || username.toLowerCase() === '@me')) {
        fetchUrl = 'https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&sort=updated&per_page=100';
      } else if (username) {
        fetchUrl = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=50`;
      } else {
        return NextResponse.json(
          { success: false, error: 'GitHub username or Organization name is required.' },
          { status: 400 }
        );
      }

      let ghRes = await fetch(fetchUrl, { headers });

      // If /users/... returned 404 and a username was provided, try /orgs/...
      if (!ghRes.ok && ghRes.status === 404 && username && !fetchUrl.includes('/user/repos')) {
        const orgUrl = `https://api.github.com/orgs/${encodeURIComponent(username)}/repos?sort=updated&per_page=50`;
        const orgRes = await fetch(orgUrl, { headers });
        if (orgRes.ok) {
          ghRes = orgRes;
        }
      }

      if (!ghRes.ok) {
        const errJson = await ghRes.json().catch(() => ({}));
        return NextResponse.json(
          {
            success: false,
            error: errJson.message || `GitHub API error: ${ghRes.statusText}`,
          },
          { status: ghRes.status }
        );
      }

      const repos = await ghRes.json();
      if (!Array.isArray(repos)) {
        return NextResponse.json({ success: true, repositories: [] });
      }

      const formatted = repos.map((r: any) => ({
        name: r.name,
        full_name: r.full_name,
        html_url: r.html_url,
        description: r.description || 'No description provided.',
        stars: r.stargazers_count,
        updated_at: r.updated_at,
        is_private: Boolean(r.private),
        owner: r.owner?.login,
      }));

      return NextResponse.json({ success: true, repositories: formatted });
    }

    return NextResponse.json({ success: false, error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Ingest from GitHub or Modrinth URL
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const body = await req.json();
    let { url, target, is_private = false, github_token } = body;
    const input = (url || target || '').trim();

    const ghToken =
      github_token ||
      req.headers.get('x-github-token') ||
      process.env.GITHUB_TOKEN;

    if (!input) {
      return NextResponse.json(
        { success: false, error: 'Repository link or project slug is required.' },
        { status: 400 }
      );
    }

    const isModrinth = input.includes('modrinth.com') || body.source === 'modrinth';
    const isGitHub = input.includes('github.com') || body.source === 'github' || (!isModrinth && input.includes('/'));

    let projectName = '';
    let sourceType: 'github' | 'modrinth' = 'github';
    const documentsToIndex: Array<{ title: string; content: string; version?: string }> = [];

    // ==========================================
    // GITHUB INGESTION
    // ==========================================
    if (isGitHub) {
      sourceType = 'github';
      const cleanRepo = input
        .replace(/^https?:\/\/github\.com\//i, '')
        .replace(/\/$/, '');
      projectName = cleanRepo.toLowerCase();

      const apiHeaders: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DiscordBot-RAG-Dashboard',
      };
      if (ghToken) {
        apiHeaders.Authorization = `Bearer ${ghToken}`;
      }

      // 1. Fetch releases
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
        console.warn('Could not fetch releases:', err);
      }

      // 2. Fetch README.md
      try {
        const readmeHeaders: Record<string, string> = {
          Accept: 'application/vnd.github.raw',
          'User-Agent': 'DiscordBot-RAG-Dashboard',
        };
        if (ghToken) {
          readmeHeaders.Authorization = `Bearer ${ghToken}`;
        }

        const readmeRes = await fetch(
          `https://api.github.com/repos/${cleanRepo}/readme`,
          { headers: readmeHeaders }
        );

        if (readmeRes.ok) {
          const readmeText = await readmeRes.text();
          if (readmeText && readmeText.trim()) {
            documentsToIndex.push({
              title: `${cleanRepo} README & Documentation`,
              version: 'main',
              content: `# ${cleanRepo} Documentation\n\n${readmeText}`,
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch README:', err);
      }

      if (documentsToIndex.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Could not retrieve documentation or releases from GitHub repo: ${cleanRepo}. Please check repo privacy or URL.`,
          },
          { status: 404 }
        );
      }
    }

    // ==========================================
    // MODRINTH INGESTION
    // ==========================================
    if (isModrinth) {
      sourceType = 'modrinth';
      let slug = input
        .replace(/^https?:\/\/modrinth\.com\/(mod|plugin|datapack|project)\//i, '')
        .replace(/\/$/, '')
        .trim();
      projectName = slug.toLowerCase();

      // Fetch project metadata & body
      const projRes = await fetch(`https://api.modrinth.com/v2/project/${slug}`, {
        headers: { 'User-Agent': 'DiscordBot-RAG-Dashboard' },
      });

      if (!projRes.ok) {
        return NextResponse.json(
          { success: false, error: `Modrinth project not found: ${slug}` },
          { status: 404 }
        );
      }

      const projData = await projRes.json();
      if (projData.body) {
        documentsToIndex.push({
          title: `${projData.title} Overview & Docs`,
          version: 'latest',
          content: `# ${projData.title}\nDescription: ${projData.description}\n\n${projData.body}`,
        });
      }

      // Fetch latest version changelogs
      try {
        const verRes = await fetch(`https://api.modrinth.com/v2/project/${slug}/version`, {
          headers: { 'User-Agent': 'DiscordBot-RAG-Dashboard' },
        });
        if (verRes.ok) {
          const versions = await verRes.json();
          for (const ver of versions.slice(0, 4)) {
            if (ver.changelog) {
              documentsToIndex.push({
                title: `${projData.title} Version ${ver.version_number}`,
                version: ver.version_number,
                content: `# ${projData.title} Changelog v${ver.version_number}\n\n${ver.changelog}`,
              });
            }
          }
        }
      } catch (err) {
        console.warn('Modrinth versions fetch warning:', err);
      }
    }

    // ==========================================
    // CHUNK, EMBED, AND SAVE INTO SUPABASE
    // ==========================================
    let totalChunksCreated = 0;

    for (const doc of documentsToIndex) {
      const chunks = chunkDocument(doc.content, 400, 50);

      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        const embedding = await getDocumentEmbedding(chunkText);

        if (!embedding) {
          console.error(`[Ingest] Failed to generate 768-dim embedding for chunk ${i} of ${projectName}`);
          continue;
        }

        const { error: insErr } = await supabase.from('knowledge_chunks').insert({
          project_name: projectName,
          source_type: sourceType,
          content: chunkText,
          metadata: {
            title: doc.title,
            version: doc.version || '1.0.0',
            chunk_index: i,
            ingested_at: new Date().toISOString(),
          },
          is_private: Boolean(is_private),
          embedding,
        });

        if (insErr) {
          console.error(`[Ingest] Supabase insert error for chunk ${i}:`, insErr.message);
        } else {
          totalChunksCreated++;
        }
      }
    }

    if (totalChunksCreated === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create embeddings or insert chunks for ${projectName}. Check Supabase vector connection or Gemini API key.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      project: projectName,
      source: sourceType,
      documents_parsed: documentsToIndex.length,
      chunks_created: totalChunksCreated,
      message: `Successfully ingested ${totalChunksCreated} chunks from ${projectName}`,
    });
  } catch (err: any) {
    console.error('Ingest error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Purge an entire project from vector memory
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(req.url);
    const project = searchParams.get('project');

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project name is required to purge.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('knowledge_chunks')
      .delete()
      .ilike('project_name', project);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Purged all vectors for project ${project}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
