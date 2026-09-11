'use client';

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Award,
  Plus,
  Trash2,
  RefreshCw,
  Zap,
  Mic,
  MessageSquare,
  Users,
} from 'lucide-react';

interface UserLevel {
  id: string;
  guild_id: string;
  user_id: string;
  user_tag: string;
  avatar_url?: string;
  text_xp: number;
  voice_xp: number;
  total_xp: number;
  level: number;
  updated_at: string;
}

interface LevelReward {
  id: string;
  guild_id: string;
  level_required: number;
  role_id: string;
}

export default function LevelingPanel({ showToast }: { showToast: (msg: string, type?: 'ok' | 'err') => void }) {
  const [leaderboard, setLeaderboard] = useState<UserLevel[]>([]);
  const [rewards, setRewards] = useState<LevelReward[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [levelReq, setLevelReq] = useState('');
  const [roleId, setRoleId] = useState('');
  const [savingReward, setSavingReward] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/leveling?limit=50');
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
        setRewards(data.rewards || []);
      }
    } catch {
      showToast('Failed to load leveling data', 'err');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelReq || !roleId) {
      showToast('Please enter both level required and Discord role ID', 'err');
      return;
    }

    try {
      setSavingReward(true);
      const res = await fetch('/api/leveling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level_required: parseInt(levelReq, 10), role_id: roleId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Level ${levelReq} reward mapped to role ${roleId}`);
        setLevelReq('');
        setRoleId('');
        loadData();
      } else {
        showToast(data.error || 'Failed to save reward', 'err');
      }
    } catch {
      showToast('Failed to save reward', 'err');
    } finally {
      setSavingReward(false);
    }
  };

  const handleDeleteReward = async (id: string) => {
    try {
      const res = await fetch(`/api/leveling?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Level reward removed');
        loadData();
      }
    } catch {
      showToast('Failed to delete reward', 'err');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#12141A] border border-[#232733] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-white tracking-tight">Leveling & Activity Engine</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border bg-amber-500/10 text-amber-400 border-amber-500/30">
                CHAT & VOICE XP
              </span>
            </div>
            <p className="text-xs text-[#949AA8] mt-1">
              Arcane/Statbot alternative tracking 60s cooldown chat messages and minute-by-minute voice presence with automated role rewards.
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
        {/* Role Rewards Assigner */}
        <div className="bg-[#12141A] border border-[#232733] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#232733] pb-3">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Level Role Rewards</h3>
          </div>

          <form onSubmit={handleAddReward} className="space-y-4">
            <div>
              <label className="text-[11px] text-[#949AA8] block mb-1">Required Level Milestone</label>
              <input
                type="number"
                min="1"
                max="100"
                placeholder="e.g. 5, 10, 20"
                value={levelReq}
                onChange={(e) => setLevelReq(e.target.value)}
                className="w-full bg-[#1A1D24] border border-[#2E3340] rounded px-3 py-2 text-xs font-mono text-white placeholder-[#606675] focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#949AA8] block mb-1">Discord Role ID to Assign</label>
              <input
                type="text"
                placeholder="e.g. 1455668527594868737"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full bg-[#1A1D24] border border-[#2E3340] rounded px-3 py-2 text-xs font-mono text-white placeholder-[#606675] focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingReward}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {savingReward ? 'Saving...' : 'Add Role Reward'}
            </button>
          </form>

          <div className="pt-3 border-t border-[#232733] space-y-2">
            <span className="text-[11px] font-mono text-[#606675] block">Configured Rewards ({rewards.length})</span>
            {rewards.length === 0 ? (
              <div className="text-xs text-[#606675] font-mono text-center py-4">No role rewards configured.</div>
            ) : (
              rewards.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2.5 rounded bg-[#161922] border border-[#232733] text-xs font-mono"
                >
                  <div>
                    <span className="text-amber-400 font-bold">Level {r.level_required}</span>
                    <span className="text-[#949AA8] ml-2">→ Role: {r.role_id}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteReward(r.id)}
                    className="text-[#606675] hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Server Leaderboard Table */}
        <div className="lg:col-span-2 bg-[#12141A] border border-[#232733] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#232733] pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Top Active Server Members</h3>
            </div>
            <span className="text-[11px] font-mono text-[#606675]">{leaderboard.length} Tracked Users</span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="p-12 text-center text-[#606675] text-xs font-mono">
              No XP records yet. Start chatting or talking in voice channels!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#232733] text-[#606675]">
                    <th className="pb-3 pl-2">#</th>
                    <th className="pb-3">User</th>
                    <th className="pb-3 text-center">Level</th>
                    <th className="pb-3 text-right">Chat XP</th>
                    <th className="pb-3 text-right">Voice XP</th>
                    <th className="pb-3 pr-2 text-right">Total XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232733]/50">
                  {leaderboard.map((u, i) => (
                    <tr key={u.id} className="hover:bg-[#161922] transition-colors">
                      <td className="py-2.5 pl-2 font-bold text-[#949AA8]">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </td>
                      <td className="py-2.5 font-semibold text-white">{u.user_tag || u.user_id}</td>
                      <td className="py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                          {u.level}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-[#949AA8]">{(u.text_xp || 0).toLocaleString()}</td>
                      <td className="py-2.5 text-right text-[#949AA8]">{(u.voice_xp || 0).toLocaleString()}</td>
                      <td className="py-2.5 pr-2 text-right font-bold text-emerald-400">
                        {(u.total_xp || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
