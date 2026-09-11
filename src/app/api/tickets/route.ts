import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const DEFAULT_GUILD_ID = '1455665865792946330';

// GET: Fetch Ticket Panels and Recent Tickets
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get('guildId') || DEFAULT_GUILD_ID;
    const status = searchParams.get('status'); // 'open', 'closed', or null for all

    const { data: panels, error: panelsError } = await supabase
      .from('ticket_panels')
      .select('*')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false });

    let query = supabase
      .from('tickets')
      .select('*')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: tickets, error: ticketsError } = await query;

    return NextResponse.json({
      success: true,
      panels: panels || [],
      tickets: tickets || [],
      error: panelsError?.message || ticketsError?.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message, panels: [], tickets: [] },
      { status: 500 }
    );
  }
}

// POST: Create or Update Ticket Panel
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const body = await req.json();

    const {
      guild_id = DEFAULT_GUILD_ID,
      channel_id,
      title = 'Support & Assistance Hub',
      description = 'Select an option below to open a private ticket with staff.',
      category_id,
      support_role_ids = [],
      options = [],
    } = body;

    if (!channel_id || !category_id) {
      return NextResponse.json(
        { success: false, error: 'channel_id and category_id are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('ticket_panels')
      .insert({
        guild_id,
        channel_id,
        title,
        description,
        category_id,
        support_role_ids,
        options,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, panel: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Update Ticket Status (Close ticket from dashboard)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const body = await req.json();
    const { ticket_id, status = 'closed', closed_by = 'Dashboard Admin' } = body;

    if (!ticket_id) {
      return NextResponse.json({ success: false, error: 'ticket_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tickets')
      .update({
        status,
        closed_by,
        closed_at: new Date().toISOString(),
      })
      .eq('id', ticket_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, ticket: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
