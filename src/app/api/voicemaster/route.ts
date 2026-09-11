import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const DEFAULT_GUILD_ID = '1455665865792946330';

// GET: Fetch Voice Hubs and active Temporary Channels
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get('guildId') || DEFAULT_GUILD_ID;

    const { data: hubs, error: hubsError } = await supabase
      .from('voice_hubs')
      .select('*')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false });

    const { data: tempChannels, error: tempError } = await supabase
      .from('temp_voice_channels')
      .select('*')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      hubs: hubs || [],
      temp_channels: tempChannels || [],
      error: hubsError?.message || tempError?.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message, hubs: [], temp_channels: [] },
      { status: 500 }
    );
  }
}

// POST: Create or Update Voice Hub
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const body = await req.json();

    const {
      guild_id = DEFAULT_GUILD_ID,
      hub_channel_id,
      category_id,
      default_name = "🔊 {username}'s Room",
      default_user_limit = 0,
      default_bitrate = 64000,
      auto_role_id = null,
    } = body;

    if (!hub_channel_id || !category_id) {
      return NextResponse.json(
        { success: false, error: 'hub_channel_id and category_id are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('voice_hubs')
      .upsert(
        {
          guild_id,
          hub_channel_id,
          category_id,
          default_name,
          default_user_limit,
          default_bitrate,
          auto_role_id,
        },
        { onConflict: 'hub_channel_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, hub: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Delete Voice Hub
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Hub ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('voice_hubs').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
