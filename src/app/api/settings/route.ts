import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

const DEFAULT_GUILD_ID = '1455665865792946330';
const DEFAULT_CHANNEL_ID = '1455668527594868737';

// GET: Fetch guild settings
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get('guildId') || DEFAULT_GUILD_ID;

    const { data, error } = await supabase
      .from('guild_settings')
      .select('*')
      .eq('guild_id', guildId)
      .maybeSingle();

    if (error) throw error;

    const settings = data || {
      guild_id: guildId,
      chat_channel_id: DEFAULT_CHANNEL_ID,
      mention_only: false,
      training_enabled: false,
      rag_threshold: 0.65,
      system_prompt: 'You are an intelligent, helpful, and concise AI assistant for this Discord server.',
    };

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Update guild settings
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const body = await req.json();
    const guildId = body.guild_id || DEFAULT_GUILD_ID;

    const { data, error } = await supabase
      .from('guild_settings')
      .upsert({
        guild_id: guildId,
        chat_channel_id: body.chat_channel_id || DEFAULT_CHANNEL_ID,
        mention_only: Boolean(body.mention_only),
        training_enabled: Boolean(body.training_enabled),
        rag_threshold: Number(body.rag_threshold) || 0.65,
        system_prompt: body.system_prompt,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, settings: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
