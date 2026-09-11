'use client';

import React, { useState, useEffect } from 'react';
import {
  Radio,
  Youtube,
  Github,
  Box,
  Plus,
  Trash2,
  RefreshCw,
  Bell,
  CheckCircle2,
} from 'lucide-react';

interface BroadcastFeed {
  id: string;
  guild_id: string;
  feed_type: 'youtube' | 'github' | 'modrinth';
  target_id: string;
  discord_channel_id: string;
  mention_role_id?: string | null;
  custom_message?: string | null;
  last_item_id?: string | null;
  is_active: boolean;
  created_at: string;
}

export default function BroadcastPanel({ showToast }: { showToast: (msg: string, type?: 'ok' | 'err') => void }) {
  const [feeds, setFeeds] = useState<BroadcastFeed[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [feedType, setFeedType] = useState<'youtube' | 'github' | 'modrinth'>('youtube');
  const [targetId, setTargetId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [mentionRoleId, setMentionRoleId] = useState('');
  const [customMsg, setCustomMsg] = useState('');
  const [adding, setAdding] = useState(false);

  const loadFeeds = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/feeds');
      const data = await res.json();
      if (data.success) {
        setFeeds(data.feeds || []);
      }
    } catch {
      showToast('Failed to load feeds', 'err');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeeds();
  }, []);

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !channelId) {
      showToast('Target ID and Discord Channel ID are required', 'err');
      return;
    }

    try {
      setAdding(true);
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feed_type: feedType,
          target_id: targetId,
          discord_channel_id: channelId,
          mention_role_id: mentionRoleId || null,
          custom_message: customMsg || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Added ${feedType.toUpperCase()} broadcast feed!`);
        setTargetId('');
        setChannelId('');
        setMentionRoleId('');
        setCustomMsg('');
        loadFeeds();
      } else {
        showToast(data.error || 'Failed to add feed', 'err');
      }
    } catch {
      showToast('Failed to add feed', 'err');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteFeed = async (id: string) => {
    try {
      const res = await fetch(`/api/feeds?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Feed removed');
        loadFeeds();
      } else {
        showToast(data.error || 'Failed to delete feed', 'err');
      }
    } catch {
      showToast('Failed to delete feed', 'err');
    }
  };

  const getFeedIcon = (type: string) => {
    if (type === 'youtube') return <Youtube className="w-4 h-4 text-red-400" />;
    if (type === 'github') return <Github className="w-4 h-4 text-white" />;
    return <Box className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#12141A] border border-[#232733] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
            <Radio className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-white tracking-tight">Broadcast Feeds & Announcements</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border bg-red-500/10 text-red-400 border-red-500/30">
                AUTOMATED DISPATCHER
              </span>
            </div>
            <p className="text-xs text-[#949AA8] mt-1">
              Automated polling for YouTube channel uploads, GitHub repository releases, and Modrinth plugin updates.
            </p>
          </div>
        </div>

        <button
          onClick={loadFeeds}
          className="px-3 py-2 bg-[#1A1D24] hover:bg-[#232733] text-[#EDEDED] border border-[#2E3340] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Feed Form */}
        <div className="bg-[#12141A] border border-[#232733] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#232733] pb-3">
            <Plus className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-white">Add Broadcast Feed</h3>
          </div>

          <form onSubmit={handleAddFeed} className="space-y-4">
            <div>
              <label className="text-[11px] text-[#949AA8] block mb-1">Feed Platform</label>
              <div className="grid grid-cols-3 gap-2">
                {(['youtube', 'github', 'modrinth'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFeedType(t)}
                    className={`py-2 px-2 rounded-lg border text-xs font-mono uppercase flex items-center justify-center gap-1.5 transition-colors ${
                      feedType === t
                        ? 'bg-[#1A1D24] text-white border-red-500/50'
                        : 'bg-[#161922] text-[#606675] border-[#2E3340]'
                    }`}
                  >
                    {getFeedIcon(t)}
                    <span className="truncate">{t}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[#949AA8] block mb-1">
                {feedType === 'youtube'
                  ? 'YouTube Channel ID (e.g. UCxxxx)'
                  : feedType === 'github'
                  ? 'GitHub Repo (e.g. SpyGamingOG/SpyCore)'
                  : 'Modrinth Project Slug'}
              </label>
              <input
                type="text"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder={
                  feedType === 'youtube'
                    ? 'UCxxxxxxxxxxxxxxxxxxxx'
                    : feedType === 'github'
                    ? 'owner/repository'
                    : 'project-slug'
                }
                className="w-full bg-[#1A1D24] border border-[#2E3340] rounded px-3 py-2 text-xs font-mono text-white placeholder-[#606675] focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#949AA8] block mb-1">Discord Destination Channel ID</label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="e.g. 1455668527594868737"
                className="w-full bg-[#1A1D24] border border-[#2E3340] rounded px-3 py-2 text-xs font-mono text-white placeholder-[#606675] focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#949AA8] block mb-1">Optional Role Mention ID</label>
              <input
                type="text"
                value={mentionRoleId}
                onChange={(e) => setMentionRoleId(e.target.value)}
                placeholder="e.g. 1455668527594868737 (optional)"
                className="w-full bg-[#1A1D24] border border-[#2E3340] rounded px-3 py-2 text-xs font-mono text-white placeholder-[#606675] focus:outline-none focus:border-red-500"
              />
            </div>

            <button
              type="submit"
              disabled={adding}
              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {adding ? 'Adding...' : 'Register Feed'}
            </button>
          </form>
        </div>

        {/* Feeds List */}
        <div className="lg:col-span-2 bg-[#12141A] border border-[#232733] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#232733] pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-white">Active Broadcast Feeds ({feeds.length})</h3>
            </div>
            <span className="text-[11px] font-mono text-[#606675]">Poll Interval: 5 min</span>
          </div>

          {feeds.length === 0 ? (
            <div className="p-12 text-center text-[#606675] text-xs font-mono">
              No broadcast feeds configured yet.
            </div>
          ) : (
            <div className="space-y-3">
              {feeds.map((feed) => (
                <div
                  key={feed.id}
                  className="p-4 rounded-lg bg-[#161922] border border-[#232733] flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono text-xs text-white">
                      {getFeedIcon(feed.feed_type)}
                      <span className="uppercase font-bold text-[#949AA8]">{feed.feed_type}:</span>
                      <span className="font-semibold">{feed.target_id}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-mono text-[#606675]">
                      <span>Destination Channel: {feed.discord_channel_id}</span>
                      {feed.mention_role_id && <span>Role: {feed.mention_role_id}</span>}
                      <span>Status: Active</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteFeed(feed.id)}
                    className="p-2 text-[#606675] hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
