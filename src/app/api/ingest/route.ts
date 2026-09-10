import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { syncProject } from '@/lib/projectIngestor';

export const dynamic = 'force-dynamic';

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

// POST: Ingest or sync project from GitHub / Modrinth, or register webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Sub-action: Automatically create GitHub Webhook on a repository
    if (body.action === 'create_webhook') {
      const { repo, github_token, webhook_url, secret } = body;
      const ghToken = github_token || process.env.GITHUB_TOKEN;

      if (!ghToken) {
        return NextResponse.json(
          { success: false, error: 'A GitHub Personal Access Token (PAT) with repo/admin:repo_hook permissions is required to register webhooks.' },
          { status: 400 }
        );
      }

      if (!repo || !webhook_url) {
        return NextResponse.json(
          { success: false, error: 'Repository name and webhook URL are required.' },
          { status: 400 }
        );
      }

      const cleanRepo = repo.replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '');

      const hookRes = await fetch(`https://api.github.com/repos/${cleanRepo}/hooks`, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `Bearer ${ghToken}`,
          'User-Agent': 'DiscordBot-RAG-Dashboard',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'web',
          active: true,
          events: ['push', 'release'],
          config: {
            url: webhook_url,
            content_type: 'json',
            secret: secret || process.env.GITHUB_WEBHOOK_SECRET || '',
            insecure_ssl: '0',
          },
        }),
      });

      const hookData = await hookRes.json();
      if (!hookRes.ok) {
        // If webhook already exists, return friendly message
        if (hookData.errors?.some((e: any) => e.message?.includes('Hook already exists'))) {
          return NextResponse.json({
            success: true,
            already_exists: true,
            message: `Webhook is already active on ${cleanRepo}! Pushes will automatically sync.`,
          });
        }
        return NextResponse.json(
          { success: false, error: hookData.message || 'Failed to create webhook on GitHub.' },
          { status: hookRes.status }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Successfully connected live webhook to ${cleanRepo}! Every git push will auto-update bot memory.`,
        hook_id: hookData.id,
      });
    }

    // Default: Ingest or Dynamic Sync
    let { url, target, is_private = false, github_token } = body;
    const input = (url || target || '').trim();

    if (!input) {
      return NextResponse.json(
        { success: false, error: 'Repository link or project slug is required.' },
        { status: 400 }
      );
    }

    const ghToken =
      github_token ||
      req.headers.get('x-github-token') ||
      process.env.GITHUB_TOKEN;

    const result = await syncProject({
      target: input,
      source: body.source,
      isPrivate: Boolean(is_private),
      githubToken: ghToken,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            result.error ||
            `Failed to create embeddings or insert chunks for ${result.project}. Check Supabase vector connection or Gemini API key.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      project: result.project,
      source: result.source,
      documents_parsed: result.documentsParsed,
      chunks_created: result.chunksCreated,
      message: `Successfully synced ${result.chunksCreated} chunks across ${result.documentsParsed} document(s) from ${result.project}`,
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
