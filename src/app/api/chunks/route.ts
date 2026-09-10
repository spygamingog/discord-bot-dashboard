import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// Helper to generate 768-dim vector using Gemini
async function getDocumentEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

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
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.embedding?.values || null;
  } catch {
    return null;
  }
}

// GET: List knowledge chunks
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(req.url);
    const project = searchParams.get('project');

    let query = supabase
      .from('knowledge_chunks')
      .select('id, project_name, source_type, content, metadata, is_private, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (project) {
      query = query.eq('project_name', project);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, chunks: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Ingest new knowledge chunk
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const body = await req.json();
    const { project, version = '1.0.0', title, content, is_private = false } = body;

    if (!project || !content) {
      return NextResponse.json(
        { success: false, error: 'Project name and content are required.' },
        { status: 400 }
      );
    }

    // Generate 768-dim embedding
    const embedding = await getDocumentEmbedding(content);

    const newRecord = {
      project_name: project,
      source_type: 'manual',
      content,
      metadata: {
        title: title || 'Manual Note',
        version,
        ingested_at: new Date().toISOString(),
      },
      is_private: Boolean(is_private),
      ...(embedding ? { embedding } : {}),
    };

    const { data, error } = await supabase
      .from('knowledge_chunks')
      .insert(newRecord)
      .select('id');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Chunk indexed successfully',
      id: data?.[0]?.id,
      inserted: 1,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: In-place edit of existing chunk with embedding recalculation
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const body = await req.json();
    const { id, content, title, project, is_private } = body;

    if (!id || !content) {
      return NextResponse.json(
        { success: false, error: 'Chunk ID and content are required.' },
        { status: 400 }
      );
    }

    // Recalculate embedding vector
    const embedding = await getDocumentEmbedding(content);

    const updatePayload: any = {
      content,
      updated_at: new Date().toISOString(),
    };

    if (project) updatePayload.project_name = project;
    if (typeof is_private === 'boolean') updatePayload.is_private = is_private;
    if (title) {
      updatePayload.metadata = {
        title,
        last_modified: new Date().toISOString(),
      };
    }
    if (embedding) {
      updatePayload.embedding = embedding;
    }

    const { data, error } = await supabase
      .from('knowledge_chunks')
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Chunk updated and embedding re-indexed',
      chunk: data?.[0],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Delete a specific chunk or purge an entire project
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(req.url);
    const chunkId = searchParams.get('id');
    const project = searchParams.get('project');

    if (chunkId) {
      const { error } = await supabase.from('knowledge_chunks').delete().eq('id', chunkId);
      if (error) throw error;
      return NextResponse.json({ success: true, message: `Deleted chunk ${chunkId}` });
    }

    if (project) {
      const { error } = await supabase.from('knowledge_chunks').delete().eq('project_name', project);
      if (error) throw error;
      return NextResponse.json({ success: true, message: `Purged all vectors for project ${project}` });
    }

    return NextResponse.json(
      { success: false, error: 'Must specify id or project parameter' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
