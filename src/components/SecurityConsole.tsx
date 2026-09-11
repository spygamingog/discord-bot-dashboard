'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  Sliders,
  Users,
  AlertTriangle,
  RefreshCw,
  Save,
  Lock,
  Bot,
  Zap,
} from 'lucide-react';

interface SecurityConfig {
  guild_id: string;
  anti_nuke_enabled: boolean;
  channel_delete_limit: number;
  channel_delete_window_seconds: number;
  role_delete_limit: number;
  role_delete_window_seconds: number;
  ban_limit: number;
  ban_window_seconds: number;
  kick_limit: number;
  kick_window_seconds: number;
  punishment_type: 'strip_roles' | 'ban' | 'kick' | 'quarantine';
  quarantine_role_id?: string | null;
  alert_channel_id?: string | null;
  whitelist_user_ids: string[];
  anti_tamper_enabled: boolean;
  anti_bot_enabled: boolean;
  ghost_ping_enabled: boolean;
}

interface ForensicLog {
  id: string;
  action_type: string;
  perpetrator_id: string;
  perpetrator_tag: string;
  enforcement_action: string;
  action_details: any;
  created_at: string;
}

export default function SecurityConsole({ showToast }: { showToast: (msg: string, type?: 'ok' | 'err') => void }) {
  const [config, setConfig] = useState<SecurityConfig | null>(null);
  const [logs, setLogs] = useState<ForensicLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [whitelistInput, setWhitelistInput] = useState('');

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/security');
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setLogs(data.logs || []);
      }
    } catch {
      showToast('Failed to load security configuration', 'err');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      const res = await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Security rules & velocity thresholds updated!');
      } else {
        showToast(data.error || 'Failed to update security', 'err');
      }
    } catch {
      showToast('Failed to save security configuration', 'err');
    } finally {
      setSaving(false);
    }
  };

  const addWhitelistUser = () => {
    const trimmed = whitelistInput.trim();
    if (!trimmed || !config) return;
    if (!config.whitelist_user_ids.includes(trimmed)) {
      setConfig({
        ...config,
        whitelist_user_ids: [...config.whitelist_user_ids, trimmed],
      });
      setWhitelistInput('');
      showToast(`Added ${trimmed} to Security Whitelist`);
    }
  };

  const removeWhitelistUser = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      whitelist_user_ids: config.whitelist_user_ids.filter((u) => u !== id),
    });
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-64 text-[#606675]">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        <span className="font-mono text-xs">Loading Sentinel Shield Forensics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#12141A] border border-[#232733] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-white tracking-tight">Sentinel Shield • Anti-Nuke & Raid Engine</h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border ${
                  config.anti_nuke_enabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}
              >
                {config.anti_nuke_enabled ? 'ARMED & ACTIVE' : 'DISARMED'}
              </span>
            </div>
            <p className="text-xs text-[#949AA8] mt-1">
              Sub-millisecond sliding-window velocity tracker guarding channels, roles, server metadata, and bots.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadSecurityData}
            className="px-3 py-2 bg-[#1A1D24] hover:bg-[#232733] text-[#EDEDED] border border-[#2E3340] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Deploy Security Rules'}
          </button>
        </div>
      </div>

      {/* Grid: Anti-Nuke Sliders & Safeguard Switches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Anti-Nuke Thresholds */}
        <div className="lg:col-span-2 bg-[#12141A] border border-[#232733] rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#232733] pb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Velocity Spike Thresholds</h3>
            </div>
            <span className="text-[11px] font-mono text-[#606675]">Sliding Window: 5s - 60s</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Channel Delete Limit */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#949AA8]">Channel Delete Limit</span>
                <span className="font-mono text-white font-semibold">{config.channel_delete_limit} in {config.channel_delete_window_seconds}s</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={config.channel_delete_limit}
                onChange={(e) => setConfig({ ...config, channel_delete_limit: parseInt(e.target.value) })}
                className="w-full accent-emerald-500 bg-[#1A1D24] rounded h-1.5 cursor-pointer"
              />
            </div>

            {/* Role Delete Limit */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#949AA8]">Role Delete Limit</span>
                <span className="font-mono text-white font-semibold">{config.role_delete_limit} in {config.role_delete_window_seconds}s</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={config.role_delete_limit}
                onChange={(e) => setConfig({ ...config, role_delete_limit: parseInt(e.target.value) })}
                className="w-full accent-emerald-500 bg-[#1A1D24] rounded h-1.5 cursor-pointer"
              />
            </div>

            {/* Ban Limit */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#949AA8]">Member Ban Velocity Limit</span>
                <span className="font-mono text-white font-semibold">{config.ban_limit} in {config.ban_window_seconds}s</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                value={config.ban_limit}
                onChange={(e) => setConfig({ ...config, ban_limit: parseInt(e.target.value) })}
                className="w-full accent-emerald-500 bg-[#1A1D24] rounded h-1.5 cursor-pointer"
              />
            </div>

            {/* Punishment Selector */}
            <div className="space-y-2">
              <label className="text-xs text-[#949AA8] block">Automatic Enforcement Action</label>
              <select
                value={config.punishment_type}
                onChange={(e) => setConfig({ ...config, punishment_type: e.target.value as any })}
                className="w-full bg-[#1A1D24] border border-[#2E3340] text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500"
              >
                <option value="strip_roles">⚡ Strip All Roles (Zero Out Permissions)</option>
                <option value="ban">🔨 Instant Server Ban</option>
                <option value="kick">👢 Instant Server Kick</option>
                <option value="quarantine">🔒 Assign Quarantine Role</option>
              </select>
            </div>
          </div>

          {/* Module Feature Toggles */}
          <div className="pt-4 border-t border-[#232733] grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setConfig({ ...config, anti_tamper_enabled: !config.anti_tamper_enabled })}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                config.anti_tamper_enabled
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bg-[#1A1D24] border-[#2E3340] opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Lock className={`w-4 h-4 ${config.anti_tamper_enabled ? 'text-emerald-400' : 'text-[#606675]'}`} />
                <span className="text-xs font-medium text-white">Anti-Vanity & Tamper</span>
              </div>
              <p className="text-[10px] text-[#949AA8] mt-1">Reverts unauthorized server name, icon, or URL changes.</p>
            </div>

            <div
              onClick={() => setConfig({ ...config, anti_bot_enabled: !config.anti_bot_enabled })}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                config.anti_bot_enabled
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bg-[#1A1D24] border-[#2E3340] opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Bot className={`w-4 h-4 ${config.anti_bot_enabled ? 'text-emerald-400' : 'text-[#606675]'}`} />
                <span className="text-xs font-medium text-white">Anti-Bot Ingestion Gate</span>
              </div>
              <p className="text-[10px] text-[#949AA8] mt-1">Instantly kicks unverified bots added without whitelist.</p>
            </div>

            <div
              onClick={() => setConfig({ ...config, ghost_ping_enabled: !config.ghost_ping_enabled })}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                config.ghost_ping_enabled
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bg-[#1A1D24] border-[#2E3340] opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className={`w-4 h-4 ${config.ghost_ping_enabled ? 'text-emerald-400' : 'text-[#606675]'}`} />
                <span className="text-xs font-medium text-white">Ghost-Ping Sniffer</span>
              </div>
              <p className="text-[10px] text-[#949AA8] mt-1">Exposes users who mention and rapidly delete messages.</p>
            </div>
          </div>
        </div>

        {/* Whitelist Manager Card */}
        <div className="bg-[#12141A] border border-[#232733] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#232733] pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Security Whitelist</h3>
            </div>
            <span className="text-[11px] font-mono text-[#606675]">{config.whitelist_user_ids.length} Trusted</span>
          </div>

          <p className="text-[11px] text-[#949AA8]">
            Users in this whitelist bypass all velocity triggers and anti-nuke restrictions.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Discord User ID..."
              value={whitelistInput}
              onChange={(e) => setWhitelistInput(e.target.value)}
              className="flex-1 bg-[#1A1D24] border border-[#2E3340] rounded px-3 py-1.5 text-xs font-mono text-white placeholder-[#606675] focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={addWhitelistUser}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold"
            >
              Add
            </button>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {config.whitelist_user_ids.map((id) => (
              <div
                key={id}
                className="flex items-center justify-between bg-[#1A1D24] border border-[#232733] rounded px-2.5 py-1.5 text-xs font-mono text-white"
              >
                <span>{id}</span>
                <button
                  onClick={() => removeWhitelistUser(id)}
                  className="text-red-400 hover:text-red-300 text-[11px]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forensic Audit Log Stream */}
      <div className="bg-[#12141A] border border-[#232733] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#232733] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Forensic Audit Log Stream</h3>
          </div>
          <span className="text-[11px] font-mono text-[#606675]">{logs.length} Recorded Incidents</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-[#606675] text-xs font-mono">
            🛡️ No security incidents or velocity spikes detected. Server is safe and quiet.
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2 font-mono text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg bg-[#161922] border border-[#232733] flex flex-col md:flex-row md:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-semibold">
                    {log.action_type}
                  </span>
                  <span className="text-white">
                    Perpetrator: <strong>{log.perpetrator_tag}</strong> ({log.perpetrator_id})
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[#949AA8] text-[11px]">
                  <span className="text-amber-400">Action: {log.enforcement_action}</span>
                  <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
