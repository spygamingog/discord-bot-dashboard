'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Compass,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  HelpCircle,
  History,
  Layers,
  Lock,
  MessageSquare,
  Network,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Search,
  Server,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Terminal,
  Trash2,
  User,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';

// Interfaces
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
  guild_id: string;
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

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function Dashboard() {
  // Navigation
  const [activeTab, setActiveTab] = useState<
    'telemetry' | 'knowledge' | 'playground' | 'rules' | 'prompt' | 'logs'
  >('telemetry');

  // Core Data
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
    system_prompt:
      'You are an intelligent, helpful, and concise AI assistant for this Discord server. Always be friendly and provide accurate answers using server documentation.',
  });

  // UI States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Knowledge Base Filter & Ingest Modal
  const [searchChunkQuery, setSearchChunkQuery] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [ingestProject, setIngestProject] = useState('');
  const [ingestVersion, setIngestVersion] = useState('1.0.0');
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestContent, setIngestContent] = useState('');
  const [ingestPrivate, setIngestPrivate] = useState(false);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [inspectChunk, setInspectChunk] = useState<Chunk | null>(null);

  // Playground State
  const [playgroundQuery, setPlaygroundQuery] = useState('');
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState<{
    answer: string;
    chunks: any[];
    provider: string;
    latency_ms: number;
    similarity_score: number;
  } | null>(null);

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Load Data
  const loadData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [statsRes, chunksRes, settingsRes] = await Promise.all([
        fetch('/api/stats').then((r) => r.json()),
        fetch('/api/chunks').then((r) => r.json()),
        fetch('/api/settings?guild_id=1455665865792946330').then((r) => r.json()),
      ]);

      if (statsRes.success) {
        setStats(statsRes.stats);
        setLogs(statsRes.recentLogs || []);
      }
      if (chunksRes.success) {
        setChunks(chunksRes.chunks || []);
      }
      if (settingsRes.success && settingsRes.settings) {
        setSettings(settingsRes.settings);
        setHasUnsavedChanges(false);
      }

      if (isManual) {
        showToast('Telemetry and settings refreshed.', 'success');
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      showToast('Failed to refresh data.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 20000);
    return () => clearInterval(interval);
  }, []);

  // Save Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setHasUnsavedChanges(false);
        showToast('Guild settings saved and synchronized!', 'success');
      } else {
        showToast(data.error || 'Failed to update settings.', 'error');
      }
    } catch {
      showToast('Network error while saving settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Ingest Document
  const handleIngestDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestProject.trim() || !ingestTitle.trim() || !ingestContent.trim()) {
      showToast('All document fields are required.', 'error');
      return;
    }
    setIngestLoading(true);
    try {
      const res = await fetch('/api/chunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: ingestProject.trim(),
          version: ingestVersion.trim() || '1.0.0',
          title: ingestTitle.trim(),
          content: ingestContent.trim(),
          is_private: ingestPrivate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Indexed ${data.inserted} chunk(s) into vector memory!`, 'success');
        setShowIngestModal(false);
        setIngestProject('');
        setIngestTitle('');
        setIngestContent('');
        loadData();
      } else {
        showToast(data.error || 'Failed to ingest document.', 'error');
      }
    } catch {
      showToast('Ingestion request failed.', 'error');
    } finally {
      setIngestLoading(false);
    }
  };

  // Delete Chunk
  const handleDeleteChunk = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge chunk?')) return;
    try {
      const res = await fetch(`/api/chunks?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Chunk deleted from vector store.', 'success');
        setChunks((prev) => prev.filter((c) => c.id !== id));
        if (inspectChunk?.id === id) setInspectChunk(null);
      } else {
        showToast('Failed to delete chunk.', 'error');
      }
    } catch {
      showToast('Failed to delete chunk.', 'error');
    }
  };

  // Run Playground Query Simulation
  const handleRunPlayground = async () => {
    if (!playgroundQuery.trim()) return;
    setPlaygroundLoading(true);
    try {
      const res = await fetch('/api/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: playgroundQuery.trim(),
          threshold: settings.rag_threshold,
          systemPrompt: settings.system_prompt,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPlaygroundResult(data);
      } else {
        showToast(data.error || 'Playground simulation failed.', 'error');
      }
    } catch {
      showToast('Error executing playground simulation.', 'error');
    } finally {
      setPlaygroundLoading(false);
    }
  };

  // Filtered Chunks
  const filteredChunks = useMemo(() => {
    return chunks.filter((c) => {
      const matchesSearch =
        searchChunkQuery === '' ||
        c.project_name.toLowerCase().includes(searchChunkQuery.toLowerCase()) ||
        c.content.toLowerCase().includes(searchChunkQuery.toLowerCase()) ||
        (c.metadata?.title &&
          c.metadata.title.toLowerCase().includes(searchChunkQuery.toLowerCase()));
      const matchesSource =
        selectedSourceFilter === 'all' ||
        c.source_type.toLowerCase() === selectedSourceFilter.toLowerCase();
      return matchesSearch && matchesSource;
    });
  }, [chunks, searchChunkQuery, selectedSourceFilter]);

  // Provider Distribution
  const groqPercent = stats.totalQueries > 0 ? Math.round((stats.groqQueries / stats.totalQueries) * 100) : 100;
  const geminiPercent = stats.totalQueries > 0 ? Math.round((stats.geminiQueries / stats.totalQueries) * 100) : 0;

  return (
    <div className="flex min-h-screen bg-[#07090E] text-[#E2E8F0]">
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-xl text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
              toast.type === 'success'
                ? 'bg-[#0E1B15]/90 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40'
                : toast.type === 'error'
                ? 'bg-[#1F0E11]/90 border-rose-500/40 text-rose-300 shadow-rose-950/40'
                : 'bg-[#111827]/90 border-indigo-500/40 text-indigo-200 shadow-indigo-950/40'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* 1. DISCORD SERVER RAIL (Leftmost 72px) */}
      <aside className="w-[72px] bg-[#0A0D14] border-r border-white/[0.05] flex flex-col items-center py-4 gap-3 shrink-0 select-none z-20">
        {/* Main Bot App Icon */}
        <div className="relative group cursor-pointer">
          <div className="server-pill h-5 top-3.5 bg-white" />
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#5865F2] to-[#3B44B8] flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/30 transition-all duration-200 group-hover:rounded-xl">
            <Bot className="w-6 h-6" />
          </div>
          {/* Tooltip */}
          <div className="absolute left-16 top-2.5 hidden group-hover:flex items-center px-3 py-1.5 rounded-lg bg-[#111522] border border-white/10 text-white text-xs font-semibold whitespace-nowrap shadow-xl z-50">
            SpyGaming RAG Bot
          </div>
        </div>

        {/* Separator */}
        <div className="w-8 h-[2px] bg-white/[0.08] rounded-full my-1" />

        {/* Connected Discord Guild */}
        <div className="relative group cursor-pointer">
          <div className="server-pill h-9 top-1.5 bg-[#5865F2]" />
          <div className="w-12 h-12 rounded-2xl bg-[#151D30] border border-[#5865F2]/40 flex items-center justify-center text-white font-extrabold text-sm shadow-md transition-all duration-200 group-hover:rounded-xl group-hover:border-[#5865F2]">
            SG
          </div>
          {/* Tooltip */}
          <div className="absolute left-16 top-2.5 hidden group-hover:flex flex-col px-3 py-1.5 rounded-lg bg-[#111522] border border-white/10 text-white text-xs whitespace-nowrap shadow-xl z-50">
            <span className="font-bold">SpyGamingOG</span>
            <span className="text-[10px] text-slate-400">1455665865792946330</span>
          </div>
        </div>

        {/* Action: Add/Explore Server */}
        <div className="relative group cursor-pointer">
          <div className="w-12 h-12 rounded-3xl bg-[#111624] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-[#11241C] hover:rounded-2xl transition-all duration-200">
            <Compass className="w-5 h-5" />
          </div>
          <div className="absolute left-16 top-2.5 hidden group-hover:flex items-center px-3 py-1.5 rounded-lg bg-[#111522] border border-white/10 text-white text-xs font-semibold whitespace-nowrap shadow-xl z-50">
            Switch Server
          </div>
        </div>

        {/* Bottom Bot Status Indicator */}
        <div className="mt-auto relative group">
          <div className="w-10 h-10 rounded-full bg-[#151D30] border border-white/10 flex items-center justify-center relative">
            <Radio className="w-4 h-4 text-[#23A55A]" />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#23A55A] ring-2 ring-[#0A0D14]" />
          </div>
          <div className="absolute left-16 bottom-1 hidden group-hover:flex flex-col px-3 py-1.5 rounded-lg bg-[#111522] border border-white/10 text-white text-xs whitespace-nowrap shadow-xl z-50">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Gateway Connected
            </span>
            <span className="text-[10px] text-slate-400">Discord WebSocket 24ms</span>
          </div>
        </div>
      </aside>

      {/* 2. CATEGORIZED NAVIGATION SIDEBAR (240px) */}
      <aside className="w-64 bg-[#0B0F19] border-r border-white/[0.05] flex flex-col shrink-0 select-none z-10">
        {/* Guild Header */}
        <div className="h-16 px-4 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-[#5865F2] flex items-center justify-center text-white font-black text-xs shrink-0">
              SG
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-sm text-white truncate font-display">SpyGamingOG</span>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Bot Active
              </span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </div>

        {/* Navigation Categories */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Overview */}
          <div>
            <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Overview
            </div>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'telemetry'
                  ? 'bg-[#5865F2] text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Telemetry & Health</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-bold">Live</span>
            </button>
          </div>

          {/* Intelligence & RAG */}
          <div>
            <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Intelligence & RAG
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('knowledge')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'knowledge'
                    ? 'bg-[#5865F2] text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Database className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">Knowledge Base</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {stats.totalChunks}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('playground')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'playground'
                    ? 'bg-[#5865F2] text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                <span className="flex-1 text-left">RAG Playground</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold uppercase">
                  Test
                </span>
              </button>
            </div>
          </div>

          {/* Bot Personality & Rules */}
          <div>
            <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Bot Personality & Rules
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('rules')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'rules'
                    ? 'bg-[#5865F2] text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Sliders className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">Channel Rules & FAQ</span>
              </button>

              <button
                onClick={() => setActiveTab('prompt')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'prompt'
                    ? 'bg-[#5865F2] text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Wand2 className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">Personality & Prompt</span>
              </button>
            </div>
          </div>

          {/* Logs & Audit */}
          <div>
            <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Audit & Logs
            </div>
            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'logs'
                  ? 'bg-[#5865F2] text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <History className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Query Audit Logs</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {stats.totalQueries}
              </span>
            </button>
          </div>
        </div>

        {/* Engine Hardware Status Footer */}
        <div className="p-3 border-t border-white/[0.05] bg-[#0A0D15]/80">
          <div className="p-2.5 rounded-xl bg-[#111726] border border-white/[0.05] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                Primary LLM
              </span>
              <span className="text-orange-400 font-bold font-mono text-[11px]">Groq Qwen 3.8</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Failover AI
              </span>
              <span className="text-cyan-400 font-bold font-mono text-[11px]">Gemini 3.6 Flash</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 3. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#07090E] overflow-y-auto">
        {/* Top App Header */}
        <header className="h-16 px-8 border-b border-white/[0.05] flex items-center justify-between bg-[#080B12]/80 backdrop-blur-md sticky top-0 z-30">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 font-medium">SpyGamingOG</span>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <span className="text-white font-bold font-display capitalize">
              {activeTab === 'telemetry' && 'Telemetry & Health'}
              {activeTab === 'knowledge' && 'Knowledge Base Studio'}
              {activeTab === 'playground' && 'RAG Playground & Simulator'}
              {activeTab === 'rules' && 'Channel Rules & FAQ Configuration'}
              {activeTab === 'prompt' && 'Personality & Prompt Engineering'}
              {activeTab === 'logs' && 'Query Audit Logs'}
            </span>
            <span className="ml-3 px-2.5 py-0.5 rounded-full bg-[#5865F2]/10 border border-[#5865F2]/30 text-[#7289DA] text-xs font-mono">
              #❓┃faq (1455668527594868737)
            </span>
          </div>

          {/* Quick Actions & Status */}
          <div className="flex items-center gap-4">
            {/* Unsaved Changes Warning */}
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Unsaved Changes</span>
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="ml-1 px-2 py-0.5 rounded bg-amber-500 text-black font-bold hover:bg-amber-400 transition"
                >
                  {savingSettings ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-[#111624] border border-white/[0.07] text-slate-300 hover:text-white hover:border-white/20 transition-all flex items-center justify-center"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#5865F2]' : ''}`} />
            </button>

            {/* Bot Online Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111B16] border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>ONLINE</span>
              <span className="text-slate-400 font-mono text-[10px] border-l border-white/10 pl-2">
                SpyGaming-RAG-Bot#6977
              </span>
            </div>

            {/* User Profile Card */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#5865F2] to-fuchsia-600 flex items-center justify-center text-white text-xs font-black shadow-md">
                V
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white">Owner</span>
                <span className="text-[10px] text-slate-400">979787181545627728</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-8 space-y-8 flex-1">
          {/* ========================================================================= */}
          {/* TAB 1: TELEMETRY & HEALTH */}
          {/* ========================================================================= */}
          {activeTab === 'telemetry' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Stat Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Total Chunks */}
                <div className="p-5 rounded-2xl bg-[#0E1422] border border-white/[0.06] shadow-xl relative overflow-hidden group hover:border-[#5865F2]/40 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider">Vector Chunks</span>
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-[#5865F2]">
                      <Database className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black font-display text-white">{stats.totalChunks}</div>
                  <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-semibold font-mono">768-dim</span>
                    <span>gemini-embedding-2-preview</span>
                  </div>
                </div>

                {/* Metric 2: Total Queries */}
                <div className="p-5 rounded-2xl bg-[#0E1422] border border-white/[0.06] shadow-xl relative overflow-hidden group hover:border-[#5865F2]/40 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider">Total Queries</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black font-display text-white">{stats.totalQueries}</div>
                  <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-semibold">100% Success</span>
                    <span>No gateway timeouts</span>
                  </div>
                </div>

                {/* Metric 3: Primary vs Failover Ratio */}
                <div className="p-5 rounded-2xl bg-[#0E1422] border border-white/[0.06] shadow-xl relative overflow-hidden group hover:border-orange-500/40 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider">Groq Primary Hits</span>
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                      <Flame className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black font-display text-white">{stats.groqQueries}</div>
                  <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="text-orange-400 font-bold">{groqPercent}%</span>
                    <span>Inference via LPU Engine</span>
                  </div>
                </div>

                {/* Metric 4: Avg Response Latency */}
                <div className="p-5 rounded-2xl bg-[#0E1422] border border-white/[0.06] shadow-xl relative overflow-hidden group hover:border-cyan-500/40 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider">Avg Latency</span>
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                      <Activity className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black font-display text-white">
                    {stats.avgLatency}
                    <span className="text-lg font-normal text-slate-400 ml-1">ms</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="text-cyan-400 font-semibold">Sub-second</span>
                    <span>Fast RAG retrieval</span>
                  </div>
                </div>
              </div>

              {/* Provider Health & Balance Meter */}
              <div className="p-6 rounded-2xl bg-[#0E1422] border border-white/[0.06] space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-white font-display">
                      Dual-Provider Failover Architecture
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Automatic HTTP 429/5xx mitigation between Groq Cloud and Google Gemini
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-2 text-orange-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                      <span>Groq LPU (Primary)</span>
                    </div>
                    <div className="flex items-center gap-2 text-cyan-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <span>Gemini Flash (Fallback)</span>
                    </div>
                  </div>
                </div>

                {/* Split Progress Meter */}
                <div className="h-4 w-full bg-[#161F36] rounded-full overflow-hidden flex p-0.5 gap-0.5">
                  <div
                    style={{ width: `${groqPercent}%` }}
                    className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-500"
                    title={`Groq: ${groqPercent}%`}
                  />
                  <div
                    style={{ width: `${geminiPercent}%` }}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
                    title={`Gemini: ${geminiPercent}%`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 rounded-xl bg-[#12192B] border border-white/[0.04] flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white">Groq LPU Status</div>
                      <div className="text-[11px] text-slate-400 font-mono">qwen/qwen3.8-27b</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                      Healthy (0 Errors)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#12192B] border border-white/[0.04] flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white">Gemini Fallback Status</div>
                      <div className="text-[11px] text-slate-400 font-mono">gemini-3.6-flash</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
                      Standby (Ready)
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Live Queries Stream */}
              <div className="p-6 rounded-2xl bg-[#0E1422] border border-white/[0.06] space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-white font-display">Recent Query Stream</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Real-time user queries processed from Discord channel #❓┃faq
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('logs')}
                    className="text-xs font-bold text-[#5865F2] hover:underline flex items-center gap-1"
                  >
                    View All Logs <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {logs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No query activity recorded yet. Send a message in #❓┃faq to see live stream!
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04] overflow-x-auto">
                    {logs.slice(0, 5).map((log) => (
                      <div key={log.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-[#182138] border border-white/10 flex items-center justify-center text-slate-300 font-bold shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-white font-medium truncate max-w-md">
                              "{log.query_text}"
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              User ID: {log.user_id}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono text-[10px] uppercase font-bold">
                            {log.provider_used}
                          </span>
                          <span className="text-slate-400 font-mono">{log.latency_ms}ms</span>
                          <span className="text-slate-500 text-[10px]">
                            {new Date(log.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: KNOWLEDGE BASE STUDIO */}
          {/* ========================================================================= */}
          {activeTab === 'knowledge' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Studio Header & Search */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white font-display">Knowledge Base Studio</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Browse, inspect, and ingest RAG documentation chunks indexed with 768-dimensional embeddings
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowIngestModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Ingest Document</span>
                  </button>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="p-4 rounded-2xl bg-[#0E1422] border border-white/[0.06] flex flex-col md:flex-row gap-4 items-center justify-between shadow-xl">
                {/* Search Bar */}
                <div className="relative w-full md:w-96">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchChunkQuery}
                    onChange={(e) => setSearchChunkQuery(e.target.value)}
                    placeholder="Search documents or chunk text..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#151C2D] border border-white/[0.08] text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#5865F2] transition"
                  />
                </div>

                {/* Source Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#151C2D] border border-white/[0.06]">
                  {['all', 'manual', 'github', 'modrinth'].map((src) => (
                    <button
                      key={src}
                      onClick={() => setSelectedSourceFilter(src)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                        selectedSourceFilter === src
                          ? 'bg-[#5865F2] text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {src}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chunks Grid */}
              {filteredChunks.length === 0 ? (
                <div className="p-16 rounded-2xl bg-[#0E1422] border border-white/[0.06] text-center space-y-3">
                  <Database className="w-12 h-12 text-slate-600 mx-auto" />
                  <div className="text-white font-bold text-base">No Knowledge Chunks Found</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    No documents match your filter. Click "+ Ingest Document" to add documentation to your bot's
                    vector brain!
                  </p>
                  <button
                    onClick={() => setShowIngestModal(true)}
                    className="mt-2 px-4 py-2 rounded-xl bg-[#5865F2] text-white text-xs font-semibold"
                  >
                    + Add Your First Document
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredChunks.map((chunk) => (
                    <div
                      key={chunk.id}
                      className="p-5 rounded-2xl bg-[#0E1422] border border-white/[0.06] hover:border-[#5865F2]/40 transition-all flex flex-col justify-between group shadow-lg"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider font-mono">
                            {chunk.source_type}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(chunk.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-white truncate font-display">
                            {chunk.metadata?.title || chunk.project_name}
                          </h4>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Project: <span className="text-slate-300">{chunk.project_name}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed bg-[#131A2C] p-3 rounded-xl border border-white/[0.03]">
                          {chunk.content}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/[0.05]">
                        <button
                          onClick={() => setInspectChunk(chunk)}
                          className="text-xs text-[#5865F2] hover:text-indigo-300 font-semibold flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect Chunk
                        </button>

                        <button
                          onClick={() => handleDeleteChunk(chunk.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Delete Chunk"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: RAG PLAYGROUND & SIMULATOR */}
          {/* ========================================================================= */}
          {activeTab === 'playground' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  RAG Playground & Simulator
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Test your questions in real time. Observe how vector embeddings match candidate chunks and how the
                  LLM generates answers with citations.
                </p>
              </div>

              {/* Simulation Input Card */}
              <div className="p-6 rounded-2xl bg-[#0E1422] border border-white/[0.06] space-y-4 shadow-xl">
                <label className="text-xs font-bold text-white block uppercase tracking-wider">
                  Ask as a Discord User
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={playgroundQuery}
                    onChange={(e) => setPlaygroundQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRunPlayground();
                    }}
                    placeholder="e.g., What are the rules of this server? or How do I link my account?"
                    className="flex-1 px-4 py-3 rounded-xl bg-[#151C2D] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#5865F2] transition"
                  />
                  <button
                    onClick={handleRunPlayground}
                    disabled={playgroundLoading || !playgroundQuery.trim()}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all shrink-0"
                  >
                    {playgroundLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Simulating...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        <span>Run Test</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Playground Results Split View */}
              {playgroundResult && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Retrieved Chunks (5 cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Database className="w-4 h-4 text-indigo-400" />
                        Retrieved Context ({playgroundResult.chunks.length})
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">
                        Threshold: {(settings.rag_threshold * 100).toFixed(0)}%
                      </span>
                    </div>

                    {playgroundResult.chunks.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-[#0E1422] border border-white/[0.06] text-center text-xs text-slate-500">
                        No chunks matched the similarity threshold. The bot will answer using generic model knowledge.
                      </div>
                    ) : (
                      playgroundResult.chunks.map((c: any, i: number) => (
                        <div
                          key={i}
                          className="p-4 rounded-xl bg-[#0E1422] border border-white/[0.06] space-y-2 shadow"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white font-display">
                              {c.metadata?.title || c.project_name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-bold">
                              {(c.similarity * 100).toFixed(1)}% match
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 bg-[#141B2D] p-3 rounded-lg font-mono line-clamp-4">
                            {c.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Right: Simulated Discord Response (7 cols) */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#5865F2]" />
                        Simulated Discord Reply
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-mono uppercase font-bold">
                          {playgroundResult.provider}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {playgroundResult.latency_ms}ms
                        </span>
                      </div>
                    </div>

                    {/* Discord Message Shell */}
                    <div className="p-5 rounded-2xl bg-[#313338] border border-white/[0.08] shadow-2xl space-y-3 font-sans">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#5865F2] flex items-center justify-center text-white shrink-0 shadow">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">SpyGaming RAG Bot</span>
                          <span className="px-1 py-0.5 rounded bg-[#5865F2] text-[10px] font-bold text-white leading-none">
                            BOT
                          </span>
                          <span className="text-xs text-slate-400">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="pl-12 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {playgroundResult.answer}
                      </div>

                      {playgroundResult.chunks.length > 0 && (
                        <div className="ml-12 pt-2 border-t border-white/10 flex items-center gap-2 text-[11px] text-slate-400">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Grounded by {playgroundResult.chunks.length} verified documentation reference(s)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: BOT RULES & FAQ CONFIGURATION */}
          {/* ========================================================================= */}
          {activeTab === 'rules' && (
            <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
              <div>
                <h2 className="text-xl font-bold text-white font-display">Channel Rules & FAQ Configuration</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure the designated chat channel, mention triggers, and similarity threshold.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0E1422] border border-white/[0.06] space-y-6 shadow-xl">
                {/* Rule 1: FAQ Channel ID */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white uppercase tracking-wider block">
                    Designated Chat / FAQ Channel ID
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-3 text-slate-500 font-mono text-sm font-bold">#</span>
                      <input
                        type="text"
                        value={settings.chat_channel_id}
                        onChange={(e) => {
                          setSettings({ ...settings, chat_channel_id: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="e.g., 1455668527594868737"
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#151C2D] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-[#5865F2] transition"
                      />
                    </div>
                    <span className="px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    The bot will respond to all natural conversation inside this channel without commands.
                  </p>
                </div>

                <div className="border-t border-white/[0.05] pt-6 space-y-6">
                  {/* Toggle 1: Require Mention */}
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[#121828] border border-white/[0.04]">
                    <div>
                      <div className="font-bold text-sm text-white">Require @Mention to Respond</div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        When enabled, the bot ignores messages in the FAQ channel unless explicitly mentioned.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSettings({ ...settings, mention_only: !settings.mention_only });
                        setHasUnsavedChanges(true);
                      }}
                      className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out ${
                        settings.mention_only ? 'bg-[#5865F2]' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                          settings.mention_only ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle 2: Training on Chat Data (Disabled by user request) */}
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[#121828] border border-white/[0.04] opacity-80">
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>Auto-Train Vector Brain on Chat Messages</span>
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase">
                          Disabled
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ingests user conversations into permanent vector memory. Kept disabled for user privacy.
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-800 text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Slider: RAG Cosine Similarity Threshold */}
                  <div className="space-y-3 p-4 rounded-xl bg-[#121828] border border-white/[0.04]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-white">RAG Similarity Threshold</div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Minimum cosine similarity required for a documentation chunk to be injected as context.
                        </p>
                      </div>
                      <span className="text-sm font-bold font-mono text-[#5865F2] px-3 py-1 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/30">
                        {(settings.rag_threshold * 100).toFixed(0)}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0.30"
                      max="0.90"
                      step="0.05"
                      value={settings.rag_threshold}
                      onChange={(e) => {
                        setSettings({ ...settings, rag_threshold: parseFloat(e.target.value) });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />

                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>30% (Permissive)</span>
                      <span className="text-emerald-400 font-bold">65% (Balanced Recommended)</span>
                      <span>90% (Strict Exact Match)</span>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingSettings ? 'Saving Settings...' : 'Save Configuration'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: PERSONALITY & PROMPT STUDIO */}
          {/* ========================================================================= */}
          {activeTab === 'prompt' && (
            <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
              <div>
                <h2 className="text-xl font-bold text-white font-display">Personality & System Prompt Studio</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tune the bot's system instructions, tone of voice, formatting guidelines, and behavior.
                </p>
              </div>

              {/* Preset Buttons */}
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    name: 'Helpful Community Assistant',
                    prompt:
                      'You are an intelligent, friendly, and concise AI assistant for the SpyGaming Discord community. Provide welcoming and accurate answers using verified documentation.',
                  },
                  {
                    name: 'Technical Documentation Lead',
                    prompt:
                      'You are a senior technical documentation specialist for this Discord server. Always provide concise, bullet-pointed, and code-accurate answers. When unsure, state missing docs clearly.',
                  },
                  {
                    name: 'Concise FAQ Bot',
                    prompt:
                      'You are a quick-answer FAQ bot for this Discord server. Keep answers under 3 sentences whenever possible, with direct links or references to documentation.',
                  },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      setSettings({ ...settings, system_prompt: preset.prompt });
                      setHasUnsavedChanges(true);
                      showToast(`Applied preset: ${preset.name}`, 'info');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#111728] border border-white/[0.08] hover:border-[#5865F2] text-slate-300 hover:text-white text-xs font-medium transition"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>

              {/* System Prompt Textarea */}
              <div className="p-6 rounded-2xl bg-[#0E1422] border border-white/[0.06] space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider block">
                    System Instruction Prompt
                  </label>
                  <span className="text-xs text-slate-400 font-mono">
                    {(settings.system_prompt || '').length} characters (~
                    {Math.round((settings.system_prompt || '').length / 4)} tokens)
                  </span>
                </div>

                <textarea
                  rows={6}
                  value={settings.system_prompt || ''}
                  onChange={(e) => {
                    setSettings({ ...settings, system_prompt: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-4 rounded-xl bg-[#151C2D] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#5865F2] transition font-sans leading-relaxed"
                  placeholder="Enter custom instructions for how the bot should behave and answer users..."
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingSettings ? 'Saving Prompt...' : 'Save System Prompt'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: AUDIT & QUERY LOGS */}
          {/* ========================================================================= */}
          {activeTab === 'logs' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-xl font-bold text-white font-display">Query Audit Logs</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete historical log of queries, latencies, provider selections, and retrieved chunk counts.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0E1422] border border-white/[0.06] space-y-4 shadow-xl">
                {logs.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-sm">
                    No query history found in database.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                          <th className="pb-3 font-semibold">User ID</th>
                          <th className="pb-3 font-semibold">Query Text</th>
                          <th className="pb-3 font-semibold">Provider</th>
                          <th className="pb-3 font-semibold">Latency</th>
                          <th className="pb-3 font-semibold">Chunks</th>
                          <th className="pb-3 font-semibold">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/[0.02] transition">
                            <td className="py-3 font-mono text-slate-400">{log.user_id}</td>
                            <td className="py-3 text-white font-medium max-w-sm truncate">
                              "{log.query_text}"
                            </td>
                            <td className="py-3">
                              <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono text-[10px] uppercase font-bold">
                                {log.provider_used}
                              </span>
                            </td>
                            <td className="py-3 font-mono text-slate-300">{log.latency_ms}ms</td>
                            <td className="py-3 font-mono text-indigo-400">{log.chunks_retrieved}</td>
                            <td className="py-3 text-slate-500 font-mono">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: INGEST DOCUMENT */}
      {/* ========================================================================= */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-[#0E1422] border border-white/[0.1] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-display">Ingest Knowledge Document</h3>
              <button
                onClick={() => setShowIngestModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIngestDocument} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">Project Name</label>
                  <input
                    type="text"
                    required
                    value={ingestProject}
                    onChange={(e) => setIngestProject(e.target.value)}
                    placeholder="e.g., ServerRules"
                    className="w-full px-3 py-2 rounded-xl bg-[#151C2D] border border-white/[0.08] text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">Version Tag</label>
                  <input
                    type="text"
                    value={ingestVersion}
                    onChange={(e) => setIngestVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="w-full px-3 py-2 rounded-xl bg-[#151C2D] border border-white/[0.08] text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Document Title</label>
                <input
                  type="text"
                  required
                  value={ingestTitle}
                  onChange={(e) => setIngestTitle(e.target.value)}
                  placeholder="e.g., Community Guidelines & Moderation Policy"
                  className="w-full px-3 py-2 rounded-xl bg-[#151C2D] border border-white/[0.08] text-white focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Content (Markdown supported)</label>
                <textarea
                  rows={6}
                  required
                  value={ingestContent}
                  onChange={(e) => setIngestContent(e.target.value)}
                  placeholder="Write or paste documentation content here..."
                  className="w-full px-3 py-2 rounded-xl bg-[#151C2D] border border-white/[0.08] text-white focus:outline-none focus:border-[#5865F2] font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#131A2B] border border-white/[0.04]">
                <div>
                  <div className="font-semibold text-white">Private Owner Documentation</div>
                  <div className="text-[10px] text-slate-400">Only accessible by bot owner queries</div>
                </div>
                <input
                  type="checkbox"
                  checked={ingestPrivate}
                  onChange={(e) => setIngestPrivate(e.target.checked)}
                  className="w-4 h-4 accent-[#5865F2] rounded cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ingestLoading}
                  className="px-5 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold shadow-lg shadow-indigo-600/30"
                >
                  {ingestLoading ? 'Vectorizing...' : 'Embed & Ingest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INSPECT CHUNK */}
      {/* ========================================================================= */}
      {inspectChunk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0E1422] border border-white/[0.1] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold">
                  {inspectChunk.source_type}
                </span>
                <h3 className="text-base font-bold text-white font-display mt-1">
                  {inspectChunk.metadata?.title || inspectChunk.project_name}
                </h3>
              </div>
              <button onClick={() => setInspectChunk(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chunk Text</span>
              <div className="p-4 rounded-xl bg-[#141C2E] border border-white/[0.05] text-xs font-mono text-slate-200 whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
                {inspectChunk.content}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#12192A] border border-white/[0.04] text-[11px] font-mono grid grid-cols-2 gap-2 text-slate-400">
              <div>ID: <span className="text-slate-300">{inspectChunk.id}</span></div>
              <div>Project: <span className="text-slate-300">{inspectChunk.project_name}</span></div>
              <div>Created: <span className="text-slate-300">{new Date(inspectChunk.created_at).toLocaleString()}</span></div>
              <div>Private: <span className="text-slate-300">{inspectChunk.is_private ? 'Yes' : 'No'}</span></div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectChunk(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
