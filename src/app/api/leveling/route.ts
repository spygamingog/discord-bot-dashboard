import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const DEFAULT_GUILD_ID = '1455665865792946330';

// GET: Fetch Server Leaderboard & Level Rewards
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get('guildId') || DEFAULT_GUILD_ID;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const { data: leaderboard, error: lbError } = await supabase
      .from('user_levels')
      .select('*')
      .eq('guild_id', guildId)
      .order('total_xp', { ascending: false })
      .limit(limit);

    const { data: rewards, error: rewError } = await supabase
      .from('level_rewards')
      .select('*')
      .eq('guild_id', guildId)
      .order('level_required', { ascending: true });

    return NextResponse.json({
      success: true,
      leaderboard: leaderboard || [],
      rewards: rewards || [],
      error: lbError?.message || rewError?.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message, leaderboard: [], rewards: [] },
      { status: 500 }
    );
  }
}

// POST: Add or Update Level Reward
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const body = await req.json();

    const { guild_id = DEFAULT_GUILD_ID, level_required, role_id } = body;

    if (!level_required || !role_id) {
      return NextResponse.json(
        { success: false, error: 'level_required and role_id are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('level_rewards')
      .upsert(
        {
          guild_id,
          level_required: parseInt(level_required, 10),
          role_id,
        },
        { onConflict: 'guild_id,level_required' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, reward: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Remove Level Reward
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Reward ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('level_rewards').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
