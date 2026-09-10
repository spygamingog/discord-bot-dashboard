'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  Lock,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';

interface Stats {
  totalChunks: number;
  totalQueries: number;
  groqQueries: number;
  geminiQueries: number;
  failoverCount: number;
  avgLatency: number;
}

interface QueryLog {
  id: string;
  user_id: string;
  query_text: string;
  provider_used: string;
  latency_ms: number;
  chunks_retrieved: number;
  failed_over: boolean;
  created_at: string;
}

interface Chunk {
  id: string;
  project_name: string;
  source_type: string;
  content: string;
  metadata: any;
  is_private: boolean;
  created_at: string;
}

interface GuildSettings {
  guild_id: string;
  chat_channel_id: string;
  mention_only: boolean;
  training_enabled: boolean;
  rag_threshold: number;
  system_prompt?: string;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'knowledge' | 'settings'>('telemetry');
  const [stats, setStats] = useState<Stats>({
    totalChunks: 0,
    totalQueries: 0,
    groqQueries: 0,
    geminiQueries: 0,
    failoverCount: 0,
    avgLatency: 0,
  });
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [settings, setSettings] = useState<GuildSettings>({
    guild_id: '1455665865792946330',
    chat_channel_id: '1455668527594868737',
    mention_only: false,
    training_enabled: false,
    rag_threshold: 0.65,
    system_prompt: 'You are an intelligent, helpful, and concise AI assistant for this Discord server.',
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Manual Ingest Form State
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [ingestProject, setIngestProject] = useState('');
  const [ingestVersion, setIngestVersion] = useState('1.0.0');
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestContent, setIngestContent] = useState('');
  const [ingestLoading, setIngestLoading] = useState(false);

  // Fetch initial telemetry and settings
  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, chunksRes, settingsRes] = await Promise.all([
        fetch('/api/stats').then((r) => r.json()),
        fetch('/api/chunks').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json()),
      ]);

      if (statsRes.success) {
        setStats(statsRes.stats);
        setLogs(statsRes.recentLogs || []);
      }
      if (chunksRes.success) {
        setChunks(chunksRes.chunks || []);
      }
      if (settingsRes.success) {
        setSettings(settingsRes.settings);
      }
    } catch (err) {
      console.error('Failed loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteChunk = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vector chunk?')) return;
    try {
      await fetch(`/api/chunks?id=${id}`, { method: 'DELETE' });
      setChunks((prev) => prev.filter((c) => c.id !== id));
      setStats((prev) => ({ ...prev, totalChunks: Math.max(0, prev.totalChunks - 1) }));
    } catch (err) {
      console.error('Delete chunk error:', err);
    }
  };

  const handlePurgeProject = async (project: string) => {
    if (!confirm(`Are you sure you want to PURGE all vectors for project "${project}"?`)) return;
    try {
      await fetch(`/api/chunks?project=${encodeURIComponent(project)}`, { method: 'DELETE' });
      setChunks((prev) => prev.filter((c) => c.project_name !== project));
      loadData();
    } catch (err) {
      console.error('Purge error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                  SpyGaming RAG Engine
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-400">Server: SpyGamingOG (1455665865792946330)</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors flex items-center gap-2 text-xs font-medium"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Data</span>
            </button>
            <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              Watching #❓┃faq
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Top 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Vector Chunks */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-indigo-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Knowledge Vectors
              </span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{stats.totalChunks}</span>
              <span className="text-xs text-slate-400 font-medium">768-dim chunks</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Supabase pgvector (HNSW Index)</p>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
          </div>

          {/* Card 2: Total AI Queries */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Queries Logged
              </span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{stats.totalQueries}</span>
              <span className="text-xs text-slate-400 font-medium">requests</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Avg Latency: ~{stats.avgLatency}ms</p>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
          </div>

          {/* Card 3: Groq Primary Speed */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-orange-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Groq LPU Primary
              </span>
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{stats.groqQueries}</span>
              <span className="text-xs text-emerald-400 font-medium">
                {stats.totalQueries > 0
                  ? `${Math.round((stats.groqQueries / stats.totalQueries) * 100)}%`
                  : '100%'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Model: qwen3.8-27b (~300ms)</p>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all"></div>
          </div>

          {/* Card 4: Gemini Failover Resiliency */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Failover Protection
              </span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Shield className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{stats.failoverCount}</span>
              <span className="text-xs text-amber-400 font-medium">auto reroutes</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Fallback: Google Gemini 3.6 Flash</p>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'telemetry'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Telemetry & Audit Log
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'knowledge'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            Knowledge Base Browser ({chunks.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'settings'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Guild Controls & AI Rules
          </button>
        </div>

        {/* TAB 1: TELEMETRY & AUDIT STREAM */}
        {activeTab === 'telemetry' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Recent Query Telemetry</h3>
                <p className="text-xs text-slate-400">
                  Real-time log of questions routed through Groq and Gemini failover.
                </p>
              </div>
              <span className="text-xs text-slate-400">Live polling active</span>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">User ID</th>
                      <th className="py-3 px-4">Query Snippet</th>
                      <th className="py-3 px-4">Routing Engine</th>
                      <th className="py-3 px-4">Latency</th>
                      <th className="py-3 px-4">RAG Chunks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No queries recorded yet. Send a message in #❓┃faq to view live telemetry!
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">{log.user_id}</td>
                          <td className="py-3 px-4 text-slate-200 max-w-xs truncate" title={log.query_text}>
                            {log.query_text}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {log.failed_over ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                ⚡ Gemini (Failover)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                                🚀 Groq LPU
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                            {log.latency_ms} ms
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono">
                            {log.chunks_retrieved || 0}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KNOWLEDGE BASE BROWSER */}
        {activeTab === 'knowledge' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">Indexed Knowledge Chunks</h3>
                <p className="text-xs text-slate-400">
                  Authorized project documentation embedded in 768-dimension vectors.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowIngestModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-indigo-600/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Manual Document
                </button>
              </div>
            </div>

            {/* Chunks List */}
            {chunks.length === 0 ? (
              <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
                <Database className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-300">Database is Currently Clean</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No vectors stored yet. Ingest documentation using Discord command{' '}
                  <code className="text-indigo-400">/ingest github &lt;repo&gt;</code> or click "Manual Document" above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="glass-panel p-4 rounded-2xl space-y-3 relative group hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase">
                          {chunk.source_type}
                        </span>
                        <h4 className="font-semibold text-sm text-white truncate max-w-[200px]">
                          {chunk.project_name}
                        </h4>
                        {chunk.metadata?.version && (
                          <span className="text-xs text-slate-400 font-mono">
                            v{chunk.metadata.version}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handlePurgeProject(chunk.project_name)}
                          className="text-xs text-slate-500 hover:text-red-400 p-1 transition-colors"
                          title={`Purge all vectors for ${chunk.project_name}`}
                        >
                          Purge All
                        </button>
                        <button
                          onClick={() => handleDeleteChunk(chunk.id)}
                          className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                          title="Delete chunk"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-4 leading-relaxed bg-slate-900/50 p-3 rounded-xl font-mono text-[11px]">
                      {chunk.content}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
                      <span>Chunk Index: #{chunk.metadata?.chunk_index ?? 0}</span>
                      <span>{new Date(chunk.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GUILD CONTROLS & AI SETTINGS */}
        {activeTab === 'settings' && (
          <div className="glass-panel p-6 rounded-2xl max-w-3xl mx-auto space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                Guild Chat & Knowledge Configuration
              </h3>
              <p className="text-xs text-slate-400">
                Configure direct chat channels, mention requirements, and RAG sensitivity.
              </p>
            </div>

            <div className="space-y-5">
              {/* Field 1: Designated Channel */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Designated Chat Channel ID
                </label>
                <input
                  type="text"
                  value={settings.chat_channel_id}
                  onChange={(e) => setSettings({ ...settings, chat_channel_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="1455668527594868737"
                />
                <p className="text-[11px] text-slate-500">
                  The bot will respond exclusively in this channel. Current: #❓┃faq
                </p>
              </div>

              {/* Field 2: Mention-Only Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-white">Require @Mention</h4>
                  <p className="text-xs text-slate-400">
                    When enabled, the bot will only respond in the channel if mentioned.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, mention_only: !settings.mention_only })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.mention_only ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.mention_only ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Field 3: Training Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                    Data Training from Chat
                    <span className="px-2 py-0.2 text-[10px] font-bold rounded bg-slate-800 text-slate-400">
                      Disabled
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Store and embed user chat interactions for model memory.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettings({ ...settings, training_enabled: !settings.training_enabled })
                  }
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.training_enabled ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.training_enabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Field 4: RAG Confidence Threshold Slider */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    RAG Cosine Similarity Threshold
                  </label>
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    {(settings.rag_threshold * 100).toFixed(0)}% ({settings.rag_threshold})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="0.90"
                  step="0.01"
                  value={settings.rag_threshold}
                  onChange={(e) =>
                    setSettings({ ...settings, rag_threshold: parseFloat(e.target.value) })
                  }
                  className="w-full accent-indigo-500"
                />
                <p className="text-[11px] text-slate-500">
                  Minimum similarity required to inject documentation. Recommended: 0.65.
                </p>
              </div>

              {/* Field 5: System Prompt */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">System Instruction</label>
                <textarea
                  rows={3}
                  value={settings.system_prompt || ''}
                  onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
                  placeholder="Set custom personality or server rules..."
                />
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {saveSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Settings updated!
                  </span>
                )}
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {savingSettings ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
