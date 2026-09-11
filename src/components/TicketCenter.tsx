'use client';

import React, { useState, useEffect } from 'react';
import {
  Ticket,
  CheckCircle,
  Clock,
  RefreshCw,
  Plus,
  Lock,
  ExternalLink,
  MessageSquare,
  FileText,
} from 'lucide-react';

interface TicketRecord {
  id: string;
  ticket_number: number;
  channel_id: string;
  opener_id: string;
  opener_tag: string;
  category_label: string;
  status: 'open' | 'closed';
  answers: any;
  transcript_url?: string;
  closed_by?: string;
  closed_at?: string;
  created_at: string;
}

interface TicketPanel {
  id: string;
  channel_id: string;
  title: string;
  description: string;
  category_id: string;
  created_at: string;
}

export default function TicketCenter({ showToast }: { showToast: (msg: string, type?: 'ok' | 'err') => void }) {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [panels, setPanels] = useState<TicketPanel[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tickets${filter !== 'all' ? `?status=${filter}` : ''}`);
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
        setPanels(data.panels || []);
      }
    } catch {
      showToast('Failed to load tickets', 'err');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const handleCloseTicket = async (ticketId: string) => {
    try {
      const res = await fetch('/api/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId, status: 'closed' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Ticket marked as closed');
        loadData();
      } else {
        showToast(data.error || 'Failed to close ticket', 'err');
      }
    } catch {
      showToast('Failed to close ticket', 'err');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#12141A] border border-[#232733] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Ticket className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-white tracking-tight">Ticket Center & Support Dispatcher</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border bg-blue-500/10 text-blue-400 border-blue-500/30">
                HTML TRANSCRIPTS
              </span>
            </div>
            <p className="text-xs text-[#949AA8] mt-1">
              Private Discord modal tickets with department routing, staff role permissions, and styled transcripts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(['open', 'closed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-[#1A1D24] text-[#949AA8] hover:text-white border border-[#2E3340]'
              }`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={loadData}
            className="p-2 bg-[#1A1D24] hover:bg-[#232733] text-[#EDEDED] border border-[#2E3340] rounded-lg transition-colors ml-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Ticket List */}
      <div className="bg-[#12141A] border border-[#232733] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#232733] pb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            Active & Archived Tickets ({tickets.length})
          </h3>
          <span className="text-[11px] font-mono text-[#606675]">Filter: {filter.toUpperCase()}</span>
        </div>

        {tickets.length === 0 ? (
          <div className="p-12 text-center text-[#606675] text-xs font-mono">
            No {filter !== 'all' ? filter : ''} tickets found in database.
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-lg bg-[#161922] border border-[#232733] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-white">#{t.ticket_number}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border ${
                        t.status === 'open'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                      }`}
                    >
                      {t.status}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-mono">
                      {t.category_label}
                    </span>
                    <span className="text-xs text-white font-medium truncate">
                      {t.answers?.subject || 'Support Request'}
                    </span>
                  </div>

                  <p className="text-xs text-[#949AA8] line-clamp-1">
                    {t.answers?.description || 'No detailed description provided.'}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] font-mono text-[#606675] pt-1">
                    <span>Opener: {t.opener_tag || t.opener_id}</span>
                    <span>Channel: {t.channel_id}</span>
                    <span>Created: {new Date(t.created_at).toLocaleString()}</span>
                    {t.closed_by && <span className="text-amber-400/80">Closed by: {t.closed_by}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {t.status === 'open' && (
                    <button
                      onClick={() => handleCloseTicket(t.id)}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Close
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
