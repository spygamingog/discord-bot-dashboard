import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { syncProject } from '@/lib/projectIngestor';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    // 1. Fetch all distinct active projects from knowledge chunks
    const { data: chunks, error } = await supabase
      .from('knowledge_chunks')
      .select('project_name, source_type, is_private, created_at');

    if (error) throw error;

    const projectMap = new Map<string, {
      name: string;
      source_type: string;
      is_private: boolean;
      last_updated: string;
    }>();

    for (const row of chunks || []) {
      const existing = projectMap.get(row.project_name);
      if (!existing) {
        projectMap.set(row.project_name, {
          name: row.project_name,
          source_type: row.source_type || 'manual',
          is_private: Boolean(row.is_private),
          last_updated: row.created_at,
        });
      } else if (new Date(row.created_at) > new Date(existing.last_updated)) {
        existing.last_updated = row.created_at;
      }
    }

    const projects = Array.from(projectMap.values()).filter(
      (p) => p.source_type === 'github' && p.name.includes('/')
    );

    console.log(`[Cron Sync] Checking ${projects.length} GitHub projects for updates...`);

    const syncResults: Array<{ project: string; status: string; chunks?: number }> = [];

    const ghHeaders: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'DiscordBot-RAG-CronSync',
    };
    if (process.env.GITHUB_TOKEN) {
      ghHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    for (const proj of projects) {
      try {
        // Query GitHub repository metadata
        const repoRes = await fetch(`https://api.github.com/repos/${proj.name}`, {
          headers: ghHeaders,
        });

        if (!repoRes.ok) {
          syncResults.push({ project: proj.name, status: `Skipped (GitHub API ${repoRes.status})` });
          continue;
        }

        const repoData = await repoRes.json();
        const pushedAt = new Date(repoData.pushed_at).getTime();
        const lastUpdated = new Date(proj.last_updated).getTime();

        // If GitHub has newer pushes than our last database update
        if (pushedAt > lastUpdated) {
          console.log(`[Cron Sync] Newer push detected for ${proj.name}. Auto-updating...`);
          const result = await syncProject({
            target: proj.name,
            isPrivate: proj.is_private,
          });

          syncResults.push({
            project: proj.name,
            status: result.success ? 'Synced' : 'Failed',
            chunks: result.chunksCreated,
          });
        } else {
          syncResults.push({ project: proj.name, status: 'Up to date' });
        }
      } catch (projErr: any) {
        syncResults.push({ project: proj.name, status: `Error: ${projErr.message}` });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checked_count: projects.length,
      results: syncResults,
    });
  } catch (err: any) {
    console.error('[Cron Sync] Error during periodic sync:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Cron sync failed' },
      { status: 500 }
    );
  }
}
