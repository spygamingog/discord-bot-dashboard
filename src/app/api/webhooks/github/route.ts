import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { syncProject } from '@/lib/projectIngestor';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    status: 'online',
    endpoint: '/api/webhooks/github',
    description: 'Real-time GitHub Webhook Receiver for automated project documentation sync.',
    supported_events: ['push', 'release', 'ping'],
  });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const event = req.headers.get('x-github-event') || 'unknown';
    const signature = req.headers.get('x-hub-signature-256');

    // Optional HMAC signature verification if secret is configured
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const expectedSig =
        'sha256=' +
        crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        console.warn('[Webhook] Invalid GitHub HMAC signature received!');
        return NextResponse.json(
          { success: false, error: 'Invalid HMAC signature.' },
          { status: 401 }
        );
      }
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload.' },
        { status: 400 }
      );
    }

    // 1. Handle ping event from GitHub (when webhook is first created)
    if (event === 'ping') {
      console.log(
        `[Webhook] GitHub ping received for repo: ${payload.repository?.full_name || 'unknown'}`
      );
      return NextResponse.json({
        success: true,
        event: 'ping',
        message: 'Pong! Webhook connected successfully.',
        zen: payload.zen,
      });
    }

    // 2. Handle push or release events
    const repo = payload.repository;
    if (!repo || !repo.full_name) {
      return NextResponse.json(
        { success: false, error: 'Missing repository information in payload.' },
        { status: 400 }
      );
    }

    const repoFullName = repo.full_name;
    const isPrivate = Boolean(repo.private);

    // Verify if this repository is already in our knowledge base
    const supabase = getSupabaseServer();
    const { count } = await supabase
      .from('knowledge_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('project_name', repoFullName.toLowerCase());

    console.log(
      `[Webhook] Received '${event}' event for '${repoFullName}'. Current chunks in memory: ${count || 0}`
    );

    // If this repo is tracked in memory, or if it's from our organization
    const isTracked = (count || 0) > 0 || repoFullName.toLowerCase().startsWith('spygamingog/');

    if (!isTracked) {
      return NextResponse.json({
        success: true,
        ignored: true,
        message: `Repository ${repoFullName} is not currently tracked in memory. To enable auto-sync, add it to memory in the dashboard first.`,
      });
    }

    // For push events, check if any markdown or manifest files were modified
    let hasRelevantChanges = true;
    if (event === 'push' && Array.isArray(payload.commits)) {
      const allChangedFiles = payload.commits.flatMap((c: any) => [
        ...(c.added || []),
        ...(c.modified || []),
        ...(c.removed || []),
      ]);

      const docFilesChanged = allChangedFiles.filter(
        (f: string) =>
          f.endsWith('.md') ||
          f.endsWith('.markdown') ||
          f.endsWith('plugin.yml') ||
          f.endsWith('config.yml')
      );

      console.log(
        `[Webhook] Changed files in push:`,
        allChangedFiles,
        `Doc changes:`,
        docFilesChanged
      );

      // If commits only changed code (e.g. .java, .gradle) without touching any docs,
      // we still check if plugin.yml changed, otherwise we can skip to save embedding tokens.
      if (allChangedFiles.length > 0 && docFilesChanged.length === 0) {
        return NextResponse.json({
          success: true,
          skipped: true,
          message: `Push did not contain changes to documentation or plugin manifests (.md / plugin.yml). Knowledge base is already up to date.`,
        });
      }
    }

    // Trigger atomic dynamic sync!
    console.log(`[Webhook] Auto-syncing documentation for ${repoFullName}...`);
    const syncResult = await syncProject({
      target: repoFullName,
      isPrivate,
    });

    if (!syncResult.success) {
      console.error(`[Webhook] Auto-sync failed for ${repoFullName}:`, syncResult.error);
      return NextResponse.json(
        { success: false, error: syncResult.error || 'Sync failed' },
        { status: 500 }
      );
    }

    console.log(
      `[Webhook] Successfully auto-synced ${repoFullName}: ${syncResult.documentsParsed} docs, ${syncResult.chunksCreated} chunks.`
    );

    return NextResponse.json({
      success: true,
      synced: true,
      event,
      project: repoFullName,
      documents_parsed: syncResult.documentsParsed,
      chunks_created: syncResult.chunksCreated,
      message: `Successfully auto-synced ${repoFullName} (${syncResult.chunksCreated} chunks).`,
    });
  } catch (err: any) {
    console.error('[Webhook] Exception handling GitHub webhook:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
