import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const DEFAULT_GUILD_ID = '1455665865792946330';

// GET: Fetch Broadcast Feeds
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get('guildId') || DEFAULT_GUILD_ID;

    const { data: feeds, error } = await supabase
      .from('broadcast_feeds')
      .select('*')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      feeds: feeds || [],
      error: error?.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message, feeds: [] },
      { status: 500 }
    );
  }
}

// POST: Create or Update Broadcast Feed
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const body = await req.json();

    const {
      guild_id = DEFAULT_GUILD_ID,
      feed_type, // 'youtube', 'github', 'modrinth'
      target_id, // YouTube Channel ID, GitHub repo, Modrinth slug
      discord_channel_id,
      mention_role_id = null,
      custom_message = null,
      is_active = true,
    } = body;

    if (!feed_type || !target_id || !discord_channel_id) {
      return NextResponse.json(
        { success: false, error: 'feed_type, target_id, and discord_channel_id are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('broadcast_feeds')
      .insert({
        guild_id,
        feed_type,
        target_id,
        discord_channel_id,
        mention_role_id,
        custom_message,
        is_active,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, feed: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Delete Broadcast Feed
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Feed ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('broadcast_feeds').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
