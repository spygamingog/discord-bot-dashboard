'use client';

import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  Plus,
  Trash2,
  RefreshCw,
  Lock,
  EyeOff,
  Users,
  Settings,
  Shield,
} from 'lucide-react';

interface VoiceHub {
  id: string;
  guild_id: string;
  hub_channel_id: string;
  category_id: string;
  default_name: string;
  default_user_limit: number;
  default_bitrate: number;
  auto_role_id?: string | null;
  created_at: string;
}

interface TempVoiceChannel {
  channel_id: string;
  guild_id: string;
  hub_id: string;
  owner_id: string;
  is_locked: boolean;
  is_hidden: boolean;
  user_limit: number;
  created_at: string;
}

export default function VoiceMasterStudio({ showToast }: { showToast: (msg: string, type?: 'ok' | 'err') => void }) {
  const [hubs, setHubs] = useState<VoiceHub[]>([]);
  const [tempChannels, setTempChannels] = useState<TempVoiceChannel[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [hubChannelId, setHubChannelId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [defaultName, setDefaultName] = useState("🔊 {username}'s Room");
  const [defaultUserLimit, setDefaultUserLimit] = useState(0);
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/voicemaster');
      const data = await res.json();
      if (data.success) {
        setHubs(data.hubs || []);
        setTempChannels(data.temp_channels || []);
      }
    } catch {
      showToast('Failed to load VoiceMaster data', 'err');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hubChannelId || !categoryId) {
      showToast('Please fill in Hub Channel ID and Category ID', 'err');
      return;
    }

    try {
      setCreating(true);
      const res = await fetch('/api/voicemaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hub_channel_id: hubChannelId,
          category_id: categoryId,
          default_name: defaultName,
          default_user_limit: defaultUserLimit,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('VoiceMaster Hub created successfully!');
        setHubChannelId('');
        setCategoryId('');
        loadData();
      } else {
        showToast(data.error || 'Failed to create hub', 'err');
      }
    } catch {
      showToast('Failed to create hub', 'err');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteHub = async (id: string) => {
    try {
      const res = await fetch(`/api/voicemaster?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Voice Hub removed');
        loadData();
      } else {
        showToast(data.error || 'Failed to delete hub', 'err');
      }
    } catch {
      showToast('Failed to delete hub', 'err');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#12141A] border border-[#232733] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Volume2 className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-white tracking-tight">VoiceMaster Studio • Join-to-Create Hubs</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border bg-purple-500/10 text-purple-400 border-purple-500/30">
                EPHEMERAL VOICE
              </span>
            </div>
            <p className="text-xs text-[#949AA8] mt-1">
              Zero-lag temporary voice rooms with in-channel interactive button controls and automatic empty cleanup.
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="px-3 py-2 bg-[#1A1D24] hover:bg-[#232733] text-[#EDEDED] border border-[#2E3340] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Hub Form */}
        <div className="bg-[#12141A] border border-[#232733] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#232733] pb-3">
            <Plus className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Create Voice Hub</h3>
          </div>

          <form onSubmit={handleCreateHub} className="space-y-4">
            <div>
              <label className="text-[11px] text-[#949AA8] block mb-1">Lobby Voice Channel ID</label>
              <input
                type="text"
                placeholder="e.g. 1455668527594868737"
                value={hubChannelId}
                onChange={(e) => setHubChannelId(e.target.value)}
                className="w-full bg-[#1A1D24] border border-[#2E3340] rounded px-3 py-2 text-xs font-mono text-white placeholder-[#606675] focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#949AA8] block mb-1">Target Category ID</label>
              <input
                type="text"
                placeholder="Category where rooms are spawned"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-[#1A1D24] border border-[#2E3340] rounded px-3 py-2 text-xs font-mono text-white placeholder-[#606675] focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#949AA8] block mb-1">Default Room Name Pattern</label>
              <input
                type="text"
                value={defaultName}
                onChange={(e) => setDefaultName(e.target.value)}
                className="w-full bg-[#1A1D24] border border-[#2E3340] rounded px-3 py-2 text-xs font-mono text-white placeholder-[#606675] focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-[#606675] mt-1 block">Use {'{username}'} for dynamic replacement</span>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {creating ? 'Creating...' : 'Register Voice Hub'}
            </button>
          </form>
        </div>

        {/* Registered Hubs List */}
        <div className="lg:col-span-2 bg-[#12141A] border border-[#232733] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#232733] pb-3">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Active Voice Hubs ({hubs.length})</h3>
            </div>
          </div>

          {hubs.length === 0 ? (
            <div className="p-8 text-center text-[#606675] text-xs font-mono">
              No VoiceMaster hubs registered yet. Create one or run <code>/voice-setup</code> in Discord.
            </div>
          ) : (
            <div className="space-y-3">
              {hubs.map((hub) => (
                <div
                  key={hub.id}
                  className="p-4 rounded-lg bg-[#161922] border border-[#232733] flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono text-xs text-white">
                      <Volume2 className="w-4 h-4 text-purple-400" />
                      <span>{hub.default_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-mono text-[#949AA8]">
                      <span>Lobby: {hub.hub_channel_id}</span>
                      <span>Category: {hub.category_id}</span>
                      <span>Bitrate: {hub.default_bitrate / 1000}kbps</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteHub(hub.id)}
                    className="p-2 text-[#606675] hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
                    title="Delete Hub"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Active Ephemeral Rooms Table */}
          <div className="pt-4 border-t border-[#232733]">
            <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Live Temporary Rooms ({tempChannels.length})
            </h4>

            {tempChannels.length === 0 ? (
              <div className="p-4 text-center text-[#606675] text-xs font-mono">
                No temporary rooms currently open.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {tempChannels.map((tc) => (
                  <div
                    key={tc.channel_id}
                    className="px-3 py-2 rounded bg-[#1A1D24] border border-[#2E3340] flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 text-white">
                      <span>Room ID: {tc.channel_id}</span>
                      <span className="text-[#606675]">(Owner: {tc.owner_id})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {tc.is_locked && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                      {tc.is_hidden && <EyeOff className="w-3.5 h-3.5 text-red-400" />}
                      <span className="text-[10px] text-[#949AA8]">{new Date(tc.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
