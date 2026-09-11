import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const DEFAULT_GUILD_ID = '1455665865792946330';

interface EmbedTemplate {
  id?: string;
  guild_id: string;
  template_key: string;
  author_name?: string | null;
  author_icon_url?: string | null;
  author_url?: string | null;
  title: string;
  title_url?: string | null;
  description: string;
  color: string;
  thumbnail_url?: string | null;
  image_url?: string | null;
  footer_text?: string | null;
  footer_icon_url?: string | null;
  show_timestamp: boolean;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
}

const DEFAULT_TEMPLATES: Record<string, EmbedTemplate> = {
  ticket_welcome: {
    guild_id: DEFAULT_GUILD_ID,
    template_key: 'ticket_welcome',
    author_name: 'SpyGaming Support Hub',
    title: '🎫 Ticket #{ticket_number} • {category}',
    description: 'Hello {user.mention}, welcome to your private ticket!\nA staff member will assist you shortly.',
    color: '#00D26A',
    footer_text: 'SpyGaming Enterprise Support',
    show_timestamp: true,
    fields: [
      { name: '📌 Subject', value: '{subject}', inline: false },
      { name: '📝 Details', value: '{description}', inline: false },
      { name: '👤 Opened By', value: '{user.tag}', inline: true },
      { name: '🏷️ Department', value: '{category}', inline: true },
    ],
  },
  level_up: {
    guild_id: DEFAULT_GUILD_ID,
    template_key: 'level_up',
    author_name: 'SpyGaming Activity Engine',
    title: '🎉 Level Up Achieved!',
    description: 'Congratulations {user.mention}! You have advanced to **Level {level}**!',
    color: '#FFD700',
    footer_text: 'Earn XP by chatting and hanging out in voice channels',
    show_timestamp: false,
    fields: [
      { name: '✨ Total XP', value: '{total_xp} XP', inline: true },
      { name: '🏆 Server Rank', value: '#{rank}', inline: true },
    ],
  },
  voicemaster_control: {
    guild_id: DEFAULT_GUILD_ID,
    template_key: 'voicemaster_control',
    author_name: 'SpyGaming VoiceMaster',
    title: '🔊 VoiceMaster Room Controller',
    description: 'Welcome to your private room, {user.mention}!\nUse the buttons below to customize access, privacy, and limits.',
    color: '#5865F2',
    footer_text: 'Auto-deletes when room is empty',
    show_timestamp: false,
    fields: [
      { name: '👑 Room Owner', value: '{user.mention}', inline: true },
      { name: '👥 Room Status', value: '🟢 Public & Unlocked', inline: true },
    ],
  },
  security_alert: {
    guild_id: DEFAULT_GUILD_ID,
    template_key: 'security_alert',
    author_name: 'Sentinel Shield Forensics',
    title: '🚨 Security Velocity Spike Detected',
    description: 'A velocity threshold violation was intercepted and neutralised.',
    color: '#ED4245',
    footer_text: 'Sentinel Shield • Autonomous Anti-Nuke Gate',
    show_timestamp: true,
    fields: [
      { name: '⚠️ Event Type', value: '{action_type}', inline: true },
      { name: '👤 Perpetrator', value: '{perpetrator_tag} ({perpetrator_id})', inline: true },
      { name: '🔨 Enforcement', value: '{enforcement}', inline: true },
    ],
  },
  broadcast: {
    guild_id: DEFAULT_GUILD_ID,
    template_key: 'broadcast',
    author_name: 'SpyGaming Network',
    title: '📢 Official Announcement',
    description: '{content}',
    color: '#5865F2',
    footer_text: 'SpyGaming Community Updates',
    show_timestamp: true,
    fields: [],
  },
};

// GET: Fetch Embed Templates for guild
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get('guildId') || DEFAULT_GUILD_ID;

    const { data: stored, error } = await supabase
      .from('embed_templates')
      .select('*')
      .eq('guild_id', guildId);

    const result: Record<string, EmbedTemplate> = { ...DEFAULT_TEMPLATES };

    if (!error && stored) {
      for (const row of stored) {
        result[row.template_key] = {
          id: row.id,
          guild_id: row.guild_id,
          template_key: row.template_key,
          author_name: row.author_name,
          author_icon_url: row.author_icon_url,
          author_url: row.author_url,
          title: row.title,
          title_url: row.title_url,
          description: row.description,
          color: row.color || '#5865F2',
          thumbnail_url: row.thumbnail_url,
          image_url: row.image_url,
          footer_text: row.footer_text,
          footer_icon_url: row.footer_icon_url,
          show_timestamp: row.show_timestamp ?? true,
          fields: Array.isArray(row.fields) ? row.fields : [],
        };
      }
    }

    return NextResponse.json({ success: true, templates: result });
  } catch (err: any) {
    return NextResponse.json(
      { success: true, templates: DEFAULT_TEMPLATES, error: err.message },
      { status: 200 }
    );
  }
}

// POST: Save or Update Embed Template
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const body = await req.json();

    const {
      guild_id = DEFAULT_GUILD_ID,
      template_key,
      author_name = null,
      author_icon_url = null,
      author_url = null,
      title,
      title_url = null,
      description,
      color = '#5865F2',
      thumbnail_url = null,
      image_url = null,
      footer_text = null,
      footer_icon_url = null,
      show_timestamp = true,
      fields = [],
    } = body;

    if (!template_key || !title || !description) {
      return NextResponse.json(
        { success: false, error: 'template_key, title, and description are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('embed_templates')
      .upsert(
        {
          guild_id,
          template_key,
          author_name,
          author_icon_url,
          author_url,
          title,
          title_url,
          description,
          color,
          thumbnail_url,
          image_url,
          footer_text,
          footer_icon_url,
          show_timestamp,
          fields,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'guild_id,template_key' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, template: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
