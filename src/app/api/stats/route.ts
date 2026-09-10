import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = getSupabaseServer();

    // 1. Fetch chunk counts
    const { count: totalChunks, error: chunksError } = await supabase
      .from('knowledge_chunks')
      .select('*', { count: 'exact', head: true });

    // 2. Fetch query logs
    const { data: logs, count: totalQueries, error: logsError } = await supabase
      .from('query_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(50);

    if (chunksError || logsError) {
      console.error('Stats query error:', chunksError || logsError);
    }

    const allLogs = logs || [];
    const groqQueries = allLogs.filter((l) => l.provider_used === 'groq').length;
    const geminiQueries = allLogs.filter((l) => l.provider_used === 'gemini').length;
    const failoverCount = allLogs.filter((l) => l.failed_over === true).length;
    const avgLatency = allLogs.length > 0
      ? Math.round(allLogs.reduce((acc, l) => acc + (l.latency_ms || 0), 0) / allLogs.length)
      : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalChunks: totalChunks || 0,
        totalQueries: totalQueries || 0,
        groqQueries,
        geminiQueries,
        failoverCount,
        avgLatency,
      },
      recentLogs: allLogs.slice(0, 10),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
