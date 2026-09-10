import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

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
