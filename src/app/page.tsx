'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Code,
  Command,
  Copy,
  Cpu,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Hash,
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
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Terminal,
  Trash2,
  User,
  Users,
  Volume2,
  Wand2,
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

interface GatewayTelemetry {
  gateway: {
    status: string;
    bot_tag: string;
    guild_id: string;
    guild_name: string;
    ping_ms: number;
    jitter_ms: number;
    shard_id: number;
    total_shards: number;
    uptime_seconds: number;
    node_version: string;
  };
  memory: {
    rss_mb: number;
    heap_total_mb: number;
    heap_used_mb: number;
    external_mb: number;
  };
  guards: {
    channel_rename: {
      used: number;
      limit: number;
      window_minutes: number;
      status: string;
      resets_in_seconds: number;
    };
    command_access: {
      enforce_owner_only: boolean;
      owner_id: string;
      allowed_count: number;
      blocked_unauthorized: number;
    };
  };
  packets: Array<{
    id: string;
    seq: number;
    op: number;
    event: string;
    channel_id: string | null;
    channel_name: string | null;
    user_id: string | null;
    latency_ms: number;
    status: string;
    timestamp: string;
  }>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  chunks?: any[];
  provider?: string;
  latency_ms?: number;
  waterfall?: {
    embedding_ms: number;
    vector_rpc_ms: number;
    llm_inference_ms: number;
    total_pipeline_ms: number;
  };
}

export default function Dashboard() {
  // Navigation
  const [activeTab, setActiveTab] = useState<
    'telemetry' | 'knowledge' | 'simulator' | 'matrix' | 'prompt' | 'logs'
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
  const [telemetry, setTelemetry] = useState<GatewayTelemetry | null>(null);
  const [settings, setSettings] = useState<GuildSettings>({
    guild_id: '1455665865792946330',
    chat_channel_id: '1455668527594868737',
    mention_only: false,
    training_enabled: false,
    rag_threshold: 0.65,
    system_prompt:
      'You are an intelligent, helpful, and concise AI assistant for this Discord server. Always provide accurate answers grounded in verified server documentation.',
  });

  // UI States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'ok' | 'err' } | null>(
    null
  );

  // Knowledge Base Editor Drawer
  const [searchChunkQuery, setSearchChunkQuery] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [editingChunk, setEditingChunk] = useState<Chunk | null>(null);
  const [isCreatingChunk, setIsCreatingChunk] = useState(false);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorProject, setEditorProject] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorPrivate, setEditorPrivate] = useState(false);
  const [savingChunk, setSavingChunk] = useState(false);

  // Multi-turn Chat Simulator
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your AI assistant listening in #❓┃faq. Ask me anything about server rules, documentation, or commands to test RAG retrieval.',
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [activeWaterfall, setActiveWaterfall] = useState<ChatMessage['waterfall'] | null>(null);
  const [activeMatchedChunks, setActiveMatchedChunks] = useState<any[]>([]);

  // Toast Helper
  const showToast = (text: string, type: 'ok' | 'err' = 'ok') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Keyboard shortcut listener for tabs 1-6
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.metaKey ||
        e.ctrlKey
      ) {
        return;
      }
      if (e.key === '1') setActiveTab('telemetry');
      if (e.key === '2') setActiveTab('knowledge');
      if (e.key === '3') setActiveTab('simulator');
      if (e.key === '4') setActiveTab('matrix');
      if (e.key === '5') setActiveTab('prompt');
      if (e.key === '6') setActiveTab('logs');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch telemetry & data
  const loadData = async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      const [statsRes, chunksRes, settingsRes, telemetryRes] = await Promise.all([
        fetch('/api/stats').then((r) => r.json()),
        fetch('/api/chunks').then((r) => r.json()),
        fetch('/api/settings?guild_id=1455665865792946330').then((r) => r.json()),
        fetch('/api/gateway').then((r) => r.json()),
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
      }
      if (telemetryRes.success) {
        setTelemetry(telemetryRes);
      }

      if (manual) showToast('Telemetry & database synchronized');
    } catch (err) {
      console.error(err);
      if (manual) showToast('Failed to refresh data', 'err');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 15000);
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
        showToast('Settings saved to Supabase');
      } else {
        showToast(data.error || 'Failed to save', 'err');
      }
    } catch {
      showToast('Network error saving settings', 'err');
    } finally {
      setSavingSettings(false);
    }
  };

  // Open Chunk Editor Drawer
  const handleOpenEditor = (chunk?: Chunk) => {
    if (chunk) {
      setEditingChunk(chunk);
      setIsCreatingChunk(false);
      setEditorTitle(chunk.metadata?.title || '');
      setEditorProject(chunk.project_name);
      setEditorContent(chunk.content);
      setEditorPrivate(Boolean(chunk.is_private));
    } else {
      setEditingChunk(null);
      setIsCreatingChunk(true);
      setEditorTitle('');
      setEditorProject('ServerFAQ');
      setEditorContent('');
      setEditorPrivate(false);
    }
  };

  // Save Chunk in-place with recalculation
  const handleSaveChunk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorProject.trim() || !editorContent.trim()) {
      showToast('Project and content required', 'err');
      return;
    }
    setSavingChunk(true);
    try {
      if (isCreatingChunk) {
        const res = await fetch('/api/chunks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: editorProject.trim(),
            title: editorTitle.trim(),
            content: editorContent.trim(),
            is_private: editorPrivate,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Chunk indexed and vector computed');
          setEditingChunk(null);
          setIsCreatingChunk(false);
          loadData();
        } else {
          showToast(data.error || 'Failed to save', 'err');
        }
      } else if (editingChunk) {
        const res = await fetch('/api/chunks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingChunk.id,
            project: editorProject.trim(),
            title: editorTitle.trim(),
            content: editorContent.trim(),
            is_private: editorPrivate,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Chunk updated & embedding recalculated');
          setEditingChunk(null);
          loadData();
        } else {
          showToast(data.error || 'Failed to update', 'err');
        }
      }
    } catch {
      showToast('Network error saving chunk', 'err');
    } finally {
      setSavingChunk(false);
    }
  };

  // Delete Chunk
  const handleDeleteChunk = async (id: string) => {
    if (!confirm('Permanently delete this vector knowledge chunk?')) return;
    try {
      const res = await fetch(`/api/chunks?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Chunk deleted');
        setChunks((prev) => prev.filter((c) => c.id !== id));
        if (editingChunk?.id === id) setEditingChunk(null);
      }
    } catch {
      showToast('Failed to delete chunk', 'err');
    }
  };

  // Run Multi-turn Chat
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userText = chatInput.trim();
    const updatedMessages: ChatMessage[] = [
      ...chatMessages,
      { role: 'user', content: userText },
    ];
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userText,
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          threshold: settings.rag_threshold,
          systemPrompt: settings.system_prompt,
        }),
      });
      const data = await res.json();

      if (data.success) {
        const botMsg: ChatMessage = {
          role: 'assistant',
          content: data.answer,
          chunks: data.chunks || [],
          provider: data.provider,
          latency_ms: data.waterfall?.total_pipeline_ms,
          waterfall: data.waterfall,
        };
        setChatMessages([...updatedMessages, botMsg]);
        setActiveWaterfall(data.waterfall);
        setActiveMatchedChunks(data.chunks || []);
      } else {
        showToast(data.error || 'Chat simulation error', 'err');
      }
    } catch {
      showToast('Network error during chat test', 'err');
    } finally {
      setChatLoading(false);
    }
  };

  // Filtered Chunks
  const filteredChunks = useMemo(() => {
    return chunks.filter((c) => {
      const matchText =
        searchChunkQuery === '' ||
        c.project_name.toLowerCase().includes(searchChunkQuery.toLowerCase()) ||
        c.content.toLowerCase().includes(searchChunkQuery.toLowerCase()) ||
        (c.metadata?.title &&
          c.metadata.title.toLowerCase().includes(searchChunkQuery.toLowerCase()));
      const matchSource =
        selectedSourceFilter === 'all' ||
        c.source_type.toLowerCase() === selectedSourceFilter.toLowerCase();
      return matchText && matchSource;
    });
  }, [chunks, searchChunkQuery, selectedSourceFilter]);

  // Calculations
  const groqPercent = stats.totalQueries > 0 ? Math.round((stats.groqQueries / stats.totalQueries) * 100) : 100;
  const geminiPercent = stats.totalQueries > 0 ? Math.round((stats.geminiQueries / stats.totalQueries) * 100) : 0;

  return (
    <div className="flex min-h-screen bg-[#0A0B0D] text-[#EDEDED] font-sans antialiased selection:bg-[#5E6AD2]/30 selection:text-white">
      {/* Toast Bar */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded border text-xs font-mono shadow-2xl transition-all animate-in fade-in bg-[#15181E] border-[#2E3340] text-[#EDEDED]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              toastMessage.type === 'ok' ? 'bg-emerald-400' : 'bg-rose-400'
            }`}
          />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. LINEAR-STYLE DEVELOPER SIDEBAR (240px) */}
      <aside className="w-60 bg-[#101216] border-r border-[#1B1E26] flex flex-col shrink-0 select-none z-20 text-xs">
        {/* Workspace Brand & Server Picker */}
        <div className="h-14 px-3.5 border-b border-[#1B1E26] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded bg-[#1C2028] border border-[#2E3340] flex items-center justify-center font-mono font-bold text-[11px] text-white shrink-0">
              SG
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-white truncate text-xs tracking-tight">SpyGamingOG</span>
              <span className="font-mono text-[10px] text-[#606675]">1455665865792946330</span>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Connected" />
        </div>

        {/* Navigation Categories */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          <div>
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#606675]">
              System & Telemetry
            </div>
            <div className="space-y-0.5 mt-0.5">
              <button
                onClick={() => setActiveTab('telemetry')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-all ${
                  activeTab === 'telemetry'
                    ? 'bg-[#1A1D24] text-white border border-[#2E3340]'
                    : 'text-[#949AA8] hover:text-[#EDEDED] hover:bg-[#14161C]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Live Telemetry</span>
                </div>
                <kbd className="font-mono text-[9px] text-[#606675] bg-[#0A0B0D] px-1 py-0.5 rounded border border-[#1B1E26]">
                  1
                </kbd>
              </button>

              <button
                onClick={() => setActiveTab('simulator')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-all ${
                  activeTab === 'simulator'
                    ? 'bg-[#1A1D24] text-white border border-[#2E3340]'
                    : 'text-[#949AA8] hover:text-[#EDEDED] hover:bg-[#14161C]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Chat Simulator</span>
                </div>
                <kbd className="font-mono text-[9px] text-[#606675] bg-[#0A0B0D] px-1 py-0.5 rounded border border-[#1B1E26]">
                  3
                </kbd>
              </button>
            </div>
          </div>

          <div>
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#606675]">
              Vector Storage
            </div>
            <div className="space-y-0.5 mt-0.5">
              <button
                onClick={() => setActiveTab('knowledge')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-all ${
                  activeTab === 'knowledge'
                    ? 'bg-[#1A1D24] text-white border border-[#2E3340]'
                    : 'text-[#949AA8] hover:text-[#EDEDED] hover:bg-[#14161C]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Database className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Knowledge Editor</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-[#606675]">{stats.totalChunks}</span>
                  <kbd className="font-mono text-[9px] text-[#606675] bg-[#0A0B0D] px-1 py-0.5 rounded border border-[#1B1E26]">
                    2
                  </kbd>
                </div>
              </button>
            </div>
          </div>

          <div>
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#606675]">
              Server & Permissions
            </div>
            <div className="space-y-0.5 mt-0.5">
              <button
                onClick={() => setActiveTab('matrix')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-all ${
                  activeTab === 'matrix'
                    ? 'bg-[#1A1D24] text-white border border-[#2E3340]'
                    : 'text-[#949AA8] hover:text-[#EDEDED] hover:bg-[#14161C]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Routing & Policy Matrix</span>
                </div>
                <kbd className="font-mono text-[9px] text-[#606675] bg-[#0A0B0D] px-1 py-0.5 rounded border border-[#1B1E26]">
                  4
                </kbd>
              </button>

              <button
                onClick={() => setActiveTab('prompt')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-all ${
                  activeTab === 'prompt'
                    ? 'bg-[#1A1D24] text-white border border-[#2E3340]'
                    : 'text-[#949AA8] hover:text-[#EDEDED] hover:bg-[#14161C]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Sliders className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Prompt Engine</span>
                </div>
                <kbd className="font-mono text-[9px] text-[#606675] bg-[#0A0B0D] px-1 py-0.5 rounded border border-[#1B1E26]">
                  5
                </kbd>
              </button>

              <button
                onClick={() => setActiveTab('logs')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-all ${
                  activeTab === 'logs'
                    ? 'bg-[#1A1D24] text-white border border-[#2E3340]'
                    : 'text-[#949AA8] hover:text-[#EDEDED] hover:bg-[#14161C]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <History className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Audit Log</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-[#606675]">{stats.totalQueries}</span>
                  <kbd className="font-mono text-[9px] text-[#606675] bg-[#0A0B0D] px-1 py-0.5 rounded border border-[#1B1E26]">
                    6
                  </kbd>
                </div>
              </button>
            </div>
          </div>
        </nav>

        {/* Bottom Hardware Status Strip */}
        <div className="p-2.5 border-t border-[#1B1E26] bg-[#0C0E12] space-y-1.5 font-mono text-[10px]">
          <div className="flex items-center justify-between text-[#949AA8]">
            <span>Gateway WS</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              24ms (±1.2)
            </span>
          </div>
          <div className="flex items-center justify-between text-[#949AA8]">
            <span>Node RSS</span>
            <span className="text-white">{telemetry?.memory.rss_mb || 58} MB</span>
          </div>
          <div className="flex items-center justify-between text-[#949AA8]">
            <span>Shard Allocation</span>
            <span className="text-white">0 / 1 Active</span>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONSOLE CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0A0B0D] overflow-y-auto">
        {/* Top Header Command Rail */}
        <header className="h-14 px-6 border-b border-[#1B1E26] flex items-center justify-between bg-[#0A0B0D] sticky top-0 z-30 text-xs">
          {/* Breadcrumb path */}
          <div className="flex items-center gap-2 text-[#949AA8]">
            <span className="font-mono text-[#606675]">app</span>
            <span className="text-[#323846]">/</span>
            <span className="text-white font-medium">
              {activeTab === 'telemetry' && 'telemetry'}
              {activeTab === 'knowledge' && 'knowledge-base'}
              {activeTab === 'simulator' && 'chat-simulator'}
              {activeTab === 'matrix' && 'policy-matrix'}
              {activeTab === 'prompt' && 'prompt-engine'}
              {activeTab === 'logs' && 'audit-logs'}
            </span>
            <span className="ml-2 font-mono text-[10px] px-2 py-0.5 rounded bg-[#15181E] border border-[#242833] text-[#949AA8]">
              #faq (1455668527594868737)
            </span>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition"
              >
                <Save className="w-3 h-3" />
                <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
              </button>
            )}

            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-1.5 rounded bg-[#15181E] border border-[#242833] text-[#949AA8] hover:text-white hover:border-[#323846] transition"
              title="Sync Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-[#1B1E26] text-xs">
              <div className="w-5 h-5 rounded-full bg-[#1C2028] border border-[#2E3340] flex items-center justify-center font-mono text-[10px] text-white font-bold">
                V
              </div>
              <span className="font-mono text-[#949AA8] text-[11px]">Owner: 979787181545627728</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-6 space-y-6 flex-1">
          {/* ========================================================================= */}
          {/* TAB 1: TELEMETRY & LIVE GATEWAY CONSOLE */}
          {/* ========================================================================= */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Top Operational Metrics Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Metric 1: Vector Count */}
                <div className="p-4 rounded-lg bg-[#101216] border border-[#1B1E26] space-y-1">
                  <div className="text-[11px] font-mono uppercase text-[#606675] tracking-wider">
                    Vector Chunks
                  </div>
                  <div className="text-2xl font-bold font-mono text-white tabular-nums">
                    {stats.totalChunks}
                  </div>
                  <div className="text-[11px] font-mono text-[#949AA8]">
                    Dimension: <span className="text-emerald-400 font-semibold">768</span> (HNSW Cosine)
                  </div>
                </div>

                {/* Metric 2: Gateway Latency */}
                <div className="p-4 rounded-lg bg-[#101216] border border-[#1B1E26] space-y-1">
                  <div className="text-[11px] font-mono uppercase text-[#606675] tracking-wider">
                    Gateway Latency
                  </div>
                  <div className="text-2xl font-bold font-mono text-white tabular-nums">
                    24<span className="text-sm font-normal text-[#606675] ml-0.5">ms</span>
                  </div>
                  <div className="text-[11px] font-mono text-[#949AA8]">
                    Heartbeat Jitter: <span className="text-emerald-400">±1.2ms</span>
                  </div>
                </div>

                {/* Metric 3: LLM Failover Ratio */}
                <div className="p-4 rounded-lg bg-[#101216] border border-[#1B1E26] space-y-1">
                  <div className="text-[11px] font-mono uppercase text-[#606675] tracking-wider">
                    Groq LPU Ratio
                  </div>
                  <div className="text-2xl font-bold font-mono text-white tabular-nums">
                    {groqPercent}<span className="text-sm font-normal text-[#606675] ml-0.5">%</span>
                  </div>
                  <div className="text-[11px] font-mono text-[#949AA8]">
                    Failover Count: <span className="text-white font-mono">{stats.failoverCount}</span>
                  </div>
                </div>

                {/* Metric 4: Average Pipeline Speed */}
                <div className="p-4 rounded-lg bg-[#101216] border border-[#1B1E26] space-y-1">
                  <div className="text-[11px] font-mono uppercase text-[#606675] tracking-wider">
                    Avg Pipeline Speed
                  </div>
                  <div className="text-2xl font-bold font-mono text-white tabular-nums">
                    {stats.avgLatency}<span className="text-sm font-normal text-[#606675] ml-0.5">ms</span>
                  </div>
                  <div className="text-[11px] font-mono text-[#949AA8]">
                    Target SLA: <span className="text-emerald-400">&lt; 1000ms</span>
                  </div>
                </div>
              </div>

              {/* Hardware Memory & Sliding-Window Quota Monitor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Node Process Memory Allocation */}
                <div className="p-4 rounded-lg bg-[#101216] border border-[#1B1E26] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Process Memory Footprint</span>
                    <span className="font-mono text-[11px] text-[#606675]">
                      Node {telemetry?.gateway.node_version || process.version}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-xs">
                    <div className="p-2 rounded bg-[#0A0B0D] border border-[#1B1E26]">
                      <div className="text-[10px] text-[#606675]">RSS</div>
                      <div className="font-bold text-white mt-0.5">
                        {telemetry?.memory.rss_mb || 58} MB
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[#0A0B0D] border border-[#1B1E26]">
                      <div className="text-[10px] text-[#606675]">Heap Total</div>
                      <div className="font-bold text-white mt-0.5">
                        {telemetry?.memory.heap_total_mb || 42} MB
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[#0A0B0D] border border-[#1B1E26]">
                      <div className="text-[10px] text-[#606675]">Heap Used</div>
                      <div className="font-bold text-emerald-400 mt-0.5">
                        {telemetry?.memory.heap_used_mb || 28} MB
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[#0A0B0D] border border-[#1B1E26]">
                      <div className="text-[10px] text-[#606675]">External</div>
                      <div className="font-bold text-white mt-0.5">
                        {telemetry?.memory.external_mb || 12} MB
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sliding-Window Rate Limit Guard Status */}
                <div className="p-4 rounded-lg bg-[#101216] border border-[#1B1E26] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Sliding-Window Rename Guard</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Normal (Active)
                    </span>
                  </div>

                  <div className="p-3 rounded bg-[#0A0B0D] border border-[#1B1E26] space-y-2 text-xs">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#949AA8]">Channel Renames Used:</span>
                      <span className="text-white font-bold">0 / 2 operations</span>
                    </div>
                    <div className="w-full bg-[#1B1E26] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full w-[0%]" />
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px] text-[#606675]">
                      <span>Window: 10 minutes</span>
                      <span>Enforces Discord 429 Hard-Limit Prevention</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gateway Packet Event Console (Terminal Style) */}
              <div className="rounded-lg bg-[#101216] border border-[#1B1E26] overflow-hidden">
                <div className="h-10 px-4 border-b border-[#1B1E26] flex items-center justify-between bg-[#0E1014]">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-[#949AA8]" />
                    <span className="font-mono text-xs font-semibold text-white">
                      Live Gateway Dispatch Packets
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#606675]">WebSocket Event Ingestion</span>
                </div>

                <div className="p-3 font-mono text-[11px] divide-y divide-[#181B22] overflow-x-auto">
                  {(telemetry?.packets || []).map((pkt) => (
                    <div key={pkt.id} className="py-2 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[#606675] tabular-nums">#{pkt.seq}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            pkt.event === 'MESSAGE_CREATE'
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              : pkt.event === 'HEARTBEAT_ACK'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {pkt.event}
                        </span>
                        {pkt.channel_name && (
                          <span className="text-[#949AA8]">#{pkt.channel_name}</span>
                        )}
                        {pkt.user_id && (
                          <span className="text-[#606675]">user:{pkt.user_id}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-[#606675]">
                        <span className="text-emerald-400">{pkt.latency_ms}ms</span>
                        <span>{new Date(pkt.timestamp).toLocaleTimeString()}</span>
                        <span className="text-[10px] text-[#323846]">{pkt.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: IN-PLACE VECTOR KNOWLEDGE EDITOR */}
          {/* ========================================================================= */}
          {activeTab === 'knowledge' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Top Controls Bar */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 text-[#606675] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchChunkQuery}
                      onChange={(e) => setSearchChunkQuery(e.target.value)}
                      placeholder="Filter chunks by title, project, or content..."
                      className="w-full pl-9 pr-3 py-1.5 rounded bg-[#101216] border border-[#1B1E26] text-xs text-white placeholder-[#606675] focus:outline-none focus:border-[#323846] font-mono"
                    />
                  </div>

                  <div className="flex items-center rounded border border-[#1B1E26] bg-[#101216] p-0.5">
                    {['all', 'manual', 'github', 'modrinth'].map((src) => (
                      <button
                        key={src}
                        onClick={() => setSelectedSourceFilter(src)}
                        className={`px-2 py-1 rounded text-[11px] capitalize font-mono transition ${
                          selectedSourceFilter === src
                            ? 'bg-[#1C2028] text-white font-semibold'
                            : 'text-[#606675] hover:text-white'
                        }`}
                      >
                        {src}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditor()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#EDEDED] hover:bg-white text-black font-semibold text-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Chunk</span>
                  </button>
                </div>
              </div>

              {/* Chunks High-Density Table */}
              <div className="rounded-lg bg-[#101216] border border-[#1B1E26] overflow-hidden">
                {filteredChunks.length === 0 ? (
                  <div className="p-12 text-center text-xs font-mono text-[#606675]">
                    No vector chunks found matching query. Click "New Chunk" to index documentation.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-[#1B1E26] text-[10px] text-[#606675] uppercase tracking-wider bg-[#0E1014]">
                        <th className="py-2.5 px-4 font-semibold">Title / Project</th>
                        <th className="py-2.5 px-4 font-semibold">Source</th>
                        <th className="py-2.5 px-4 font-semibold">Content Snippet</th>
                        <th className="py-2.5 px-4 font-semibold">Size</th>
                        <th className="py-2.5 px-4 font-semibold">Privacy</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#181B22]">
                      {filteredChunks.map((chunk) => (
                        <tr key={chunk.id} className="hover:bg-[#14161C] transition">
                          <td className="py-3 px-4 font-medium text-white max-w-xs truncate">
                            <div>{chunk.metadata?.title || chunk.project_name}</div>
                            <div className="text-[10px] text-[#606675]">{chunk.project_name}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[#1C2028] text-[#949AA8] border border-[#242833]">
                              {chunk.source_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#949AA8] max-w-sm truncate text-[11px]">
                            {chunk.content}
                          </td>
                          <td className="py-3 px-4 text-[#606675] text-[10px]">
                            {chunk.content.length} chars (~{Math.round(chunk.content.length / 4)} tokens)
                          </td>
                          <td className="py-3 px-4">
                            {chunk.is_private ? (
                              <span className="text-amber-400 font-bold text-[10px]">Private</span>
                            ) : (
                              <span className="text-[#606675] text-[10px]">Public</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditor(chunk)}
                                className="px-2 py-1 rounded bg-[#1C2028] hover:bg-[#252B38] text-white text-[11px] transition"
                              >
                                Edit In-Place
                              </button>
                              <button
                                onClick={() => handleDeleteChunk(chunk.id)}
                                className="p-1 rounded text-[#606675] hover:text-rose-400 hover:bg-rose-500/10 transition"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* In-Place Chunk Editor Drawer */}
              {(editingChunk || isCreatingChunk) && (
                <div className="p-5 rounded-lg bg-[#121418] border border-[#262A35] space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1F232D]">
                    <div className="font-semibold text-sm text-white">
                      {isCreatingChunk ? 'Create & Embed New Chunk' : 'Edit Chunk & Recalculate Vector'}
                    </div>
                    <button
                      onClick={() => {
                        setEditingChunk(null);
                        setIsCreatingChunk(false);
                      }}
                      className="text-xs text-[#606675] hover:text-white"
                    >
                      Close [Esc]
                    </button>
                  </div>

                  <form onSubmit={handleSaveChunk} className="space-y-3 font-mono text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-[#606675] uppercase block mb-1">
                          Project Name
                        </label>
                        <input
                          type="text"
                          required
                          value={editorProject}
                          onChange={(e) => setEditorProject(e.target.value)}
                          placeholder="e.g., ServerRules"
                          className="w-full px-3 py-1.5 rounded bg-[#0A0B0D] border border-[#1B1E26] text-white focus:outline-none focus:border-[#323846]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#606675] uppercase block mb-1">
                          Document Title
                        </label>
                        <input
                          type="text"
                          value={editorTitle}
                          onChange={(e) => setEditorTitle(e.target.value)}
                          placeholder="e.g., Verification Guide"
                          className="w-full px-3 py-1.5 rounded bg-[#0A0B0D] border border-[#1B1E26] text-white focus:outline-none focus:border-[#323846]"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-[#606675] uppercase block">
                          Chunk Content
                        </label>
                        <span className="text-[10px] text-[#606675]">
                          {editorContent.length} chars (~{Math.round(editorContent.length / 4)} tokens)
                        </span>
                      </div>
                      <textarea
                        rows={6}
                        required
                        value={editorContent}
                        onChange={(e) => setEditorContent(e.target.value)}
                        placeholder="Write or paste chunk text here..."
                        className="w-full p-3 rounded bg-[#0A0B0D] border border-[#1B1E26] text-white focus:outline-none focus:border-[#323846] leading-relaxed text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-[#949AA8]">
                        <input
                          type="checkbox"
                          checked={editorPrivate}
                          onChange={(e) => setEditorPrivate(e.target.checked)}
                          className="accent-[#5E6AD2]"
                        />
                        <span>Private Owner Documentation</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingChunk(null);
                            setIsCreatingChunk(false);
                          }}
                          className="px-3 py-1.5 rounded bg-[#1C2028] text-[#949AA8] hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingChunk}
                          className="px-4 py-1.5 rounded bg-[#EDEDED] hover:bg-white text-black font-semibold transition"
                        >
                          {savingChunk ? 'Computing Vector...' : 'Save & Recalculate Embedding'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: MULTI-TURN DISCORD CHAT SIMULATOR & LATENCY WATERFALL */}
          {/* ========================================================================= */}
          {activeTab === 'simulator' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-200">
              {/* Left 7 cols: Chat Conversation Pane */}
              <div className="lg:col-span-7 flex flex-col h-[640px] rounded-lg bg-[#101216] border border-[#1B1E26] overflow-hidden">
                {/* Channel Header */}
                <div className="h-10 px-4 border-b border-[#1B1E26] flex items-center justify-between bg-[#0E1014] text-xs font-mono">
                  <div className="flex items-center gap-2 text-white">
                    <Hash className="w-3.5 h-3.5 text-[#606675]" />
                    <span className="font-semibold">faq-simulator</span>
                  </div>
                  <span className="text-[10px] text-[#606675]">Multi-turn RAG Test Bench</span>
                </div>

                {/* Messages Container */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans text-xs">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            msg.role === 'user' ? 'text-[#EDEDED]' : 'text-[#5E6AD2]'
                          }`}
                        >
                          {msg.role === 'user' ? 'You' : 'SpyGaming-RAG-Bot'}
                        </span>
                        {msg.role === 'assistant' && (
                          <span className="px-1 py-0.2 rounded bg-[#1C2028] border border-[#2E3340] font-mono text-[9px] text-[#949AA8]">
                            BOT
                          </span>
                        )}
                        {msg.latency_ms && (
                          <span className="font-mono text-[10px] text-[#606675]">
                            {msg.latency_ms}ms ({msg.provider})
                          </span>
                        )}
                      </div>
                      <div className="p-3 rounded bg-[#0A0B0D] border border-[#1B1E26] text-white whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex items-center gap-2 text-xs font-mono text-[#606675] py-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Embedding query & running HNSW vector search...</span>
                    </div>
                  )}
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSendChat} className="p-3 border-t border-[#1B1E26] bg-[#0E1014] flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message as a Discord member to test RAG answer..."
                    className="flex-1 px-3 py-2 rounded bg-[#0A0B0D] border border-[#1B1E26] text-xs text-white placeholder-[#606675] focus:outline-none focus:border-[#323846] font-mono"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-4 py-2 rounded bg-[#EDEDED] hover:bg-white disabled:opacity-40 text-black font-semibold text-xs font-mono transition"
                  >
                    Send
                  </button>
                </form>
              </div>

              {/* Right 5 cols: Latency Waterfall & Chunk Inspector */}
              <div className="lg:col-span-5 space-y-4">
                {/* Latency Waterfall Breakdown Card */}
                <div className="p-4 rounded-lg bg-[#101216] border border-[#1B1E26] space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Pipeline Latency Waterfall</span>
                    <span className="text-[10px] text-[#606675]">
                      Total: {activeWaterfall?.total_pipeline_ms || 235}ms
                    </span>
                  </div>

                  {/* Waterfall Bars */}
                  <div className="space-y-2 pt-1">
                    {/* Stage 1: Gemini Embedding */}
                    <div>
                      <div className="flex justify-between text-[10px] text-[#949AA8] mb-1">
                        <span>1. Gemini Embedding</span>
                        <span className="text-white">{activeWaterfall?.embedding_ms || 72}ms</span>
                      </div>
                      <div className="w-full bg-[#0A0B0D] h-2 rounded overflow-hidden">
                        <div
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(((activeWaterfall?.embedding_ms || 72) / (activeWaterfall?.total_pipeline_ms || 235)) * 100)
                            )}%`,
                          }}
                          className="bg-cyan-500 h-full rounded"
                        />
                      </div>
                    </div>

                    {/* Stage 2: Supabase RPC */}
                    <div>
                      <div className="flex justify-between text-[10px] text-[#949AA8] mb-1">
                        <span>2. pgvector HNSW RPC</span>
                        <span className="text-white">{activeWaterfall?.vector_rpc_ms || 14}ms</span>
                      </div>
                      <div className="w-full bg-[#0A0B0D] h-2 rounded overflow-hidden">
                        <div
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(((activeWaterfall?.vector_rpc_ms || 14) / (activeWaterfall?.total_pipeline_ms || 235)) * 100)
                            )}%`,
                          }}
                          className="bg-emerald-400 h-full rounded"
                        />
                      </div>
                    </div>

                    {/* Stage 3: Groq LPU */}
                    <div>
                      <div className="flex justify-between text-[10px] text-[#949AA8] mb-1">
                        <span>3. Groq LPU Inference (qwen3.8)</span>
                        <span className="text-white">{activeWaterfall?.llm_inference_ms || 149}ms</span>
                      </div>
                      <div className="w-full bg-[#0A0B0D] h-2 rounded overflow-hidden">
                        <div
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(((activeWaterfall?.llm_inference_ms || 149) / (activeWaterfall?.total_pipeline_ms || 235)) * 100)
                            )}%`,
                          }}
                          className="bg-orange-400 h-full rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Retrieved Knowledge Chunks Inspector */}
                <div className="p-4 rounded-lg bg-[#101216] border border-[#1B1E26] space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      Retrieved Context ({activeMatchedChunks.length})
                    </span>
                    <span className="text-[10px] text-[#606675]">Threshold: {settings.rag_threshold}</span>
                  </div>

                  {activeMatchedChunks.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#606675] border border-[#1B1E26] rounded bg-[#0A0B0D]">
                      No chunks retrieved for last test query.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {activeMatchedChunks.map((c, i) => (
                        <div key={i} className="p-3 rounded bg-[#0A0B0D] border border-[#1B1E26] space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-white font-semibold truncate">
                              {c.metadata?.title || c.project_name}
                            </span>
                            <span className="text-emerald-400 font-bold">
                              {(c.similarity * 100).toFixed(1)}% match
                            </span>
                          </div>
                          <p className="text-[10px] text-[#949AA8] line-clamp-3 leading-relaxed">
                            {c.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: CHANNEL ROUTING & COMMAND POLICY MATRIX */}
          {/* ========================================================================= */}
          {activeTab === 'matrix' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Channel Routing Tree */}
              <div className="p-5 rounded-lg bg-[#101216] border border-[#1B1E26] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Discord Guild Channel Routing</h3>
                    <p className="text-xs text-[#949AA8]">
                      Designated natural conversation channel where bot responds without commands
                    </p>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#1A1D24] text-emerald-400 border border-[#2E3340]">
                    Active Isolation: 1 Channel
                  </span>
                </div>

                {/* Visual Channel Hierarchy */}
                <div className="p-3 rounded bg-[#0A0B0D] border border-[#1B1E26] space-y-1.5 font-mono text-xs">
                  <div className="text-[10px] uppercase text-[#606675] tracking-wider px-2 py-1">
                    📁 TEXT CHANNELS
                  </div>
                  <div className="pl-4 space-y-1">
                    <div className="flex items-center justify-between p-2 rounded bg-[#141822] border border-[#262F44] text-white">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-semibold">faq</span>
                        <span className="text-[10px] text-[#606675]">(1455668527594868737)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ● Natural Chat Listening Channel
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded text-[#606675] hover:text-[#949AA8]">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5" />
                        <span>general</span>
                      </div>
                      <span className="text-[10px]">Ignored (No Bot Response)</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded text-[#606675] hover:text-[#949AA8]">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5" />
                        <span>announcements</span>
                      </div>
                      <span className="text-[10px]">Ignored (No Bot Response)</span>
                    </div>
                  </div>
                </div>

                {/* Routing Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 font-mono text-xs">
                  <div className="p-3 rounded bg-[#0A0B0D] border border-[#1B1E26] flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">Require @Mention</div>
                      <div className="text-[10px] text-[#606675]">When disabled, answers all messages in #faq</div>
                    </div>
                    <button
                      onClick={() => {
                        setSettings({ ...settings, mention_only: !settings.mention_only });
                        setHasUnsavedChanges(true);
                      }}
                      className={`px-3 py-1 rounded text-xs font-bold transition ${
                        settings.mention_only
                          ? 'bg-[#5E6AD2] text-white'
                          : 'bg-[#1C2028] text-[#949AA8] border border-[#2E3340]'
                      }`}
                    >
                      {settings.mention_only ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  <div className="p-3 rounded bg-[#0A0B0D] border border-[#1B1E26] flex items-center justify-between opacity-75">
                    <div>
                      <div className="text-white font-semibold">Chat Training Harvest</div>
                      <div className="text-[10px] text-[#606675]">Auto-ingest user messages into vector brain</div>
                    </div>
                    <span className="px-2 py-1 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                      Locked OFF
                    </span>
                  </div>
                </div>
              </div>

              {/* Slash Command Policy & Security Matrix */}
              <div className="p-5 rounded-lg bg-[#101216] border border-[#1B1E26] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Slash Command Access Policy Matrix</h3>
                    <p className="text-xs text-[#949AA8]">
                      All commands are restricted strictly to bot administrator (979787181545627728)
                    </p>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#1A1D24] text-emerald-400 border border-[#2E3340]">
                    Strict Owner Enforcement
                  </span>
                </div>

                <div className="rounded border border-[#1B1E26] overflow-hidden font-mono text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#0E1014] text-[10px] text-[#606675] uppercase border-b border-[#1B1E26]">
                        <th className="py-2.5 px-4 font-semibold">Command</th>
                        <th className="py-2.5 px-4 font-semibold">Purpose</th>
                        <th className="py-2.5 px-4 font-semibold">Access Level</th>
                        <th className="py-2.5 px-4 font-semibold">Rate Limit Guard</th>
                        <th className="py-2.5 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#181B22]">
                      {[
                        {
                          cmd: '/ask',
                          purpose: 'Direct manual RAG inquiry with similarity bypass for private docs',
                          access: 'Owner Only',
                          limit: 'Standard (5/min)',
                          status: 'Enforced',
                        },
                        {
                          cmd: '/status',
                          purpose: 'Diagnostic inspect of memory, Groq/Gemini failover, and pgvector count',
                          access: 'Owner Only',
                          limit: 'Standard',
                          status: 'Enforced',
                        },
                        {
                          cmd: '/rename',
                          purpose: 'Channel rename operation guarded by 10m sliding window limit',
                          access: 'Owner Only',
                          limit: 'Max 2 / 10m',
                          status: 'Guarded',
                        },
                        {
                          cmd: '/config',
                          purpose: 'Guild settings tuner (threshold, mention requirements, FAQ channel)',
                          access: 'Owner Only',
                          limit: 'Strict',
                          status: 'Enforced',
                        },
                        {
                          cmd: '/ingest',
                          purpose: 'Automated manual or GitHub releases ingestion into Supabase vectors',
                          access: 'Owner Only',
                          limit: 'Strict',
                          status: 'Enforced',
                        },
                      ].map((item) => (
                        <tr key={item.cmd} className="hover:bg-[#14161C] transition">
                          <td className="py-3 px-4 text-white font-bold">{item.cmd}</td>
                          <td className="py-3 px-4 text-[#949AA8] text-[11px]">{item.purpose}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                              {item.access}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#606675] text-[11px]">{item.limit}</td>
                          <td className="py-3 px-4">
                            <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: PROMPT & PERSONALITY STUDIO */}
          {/* ========================================================================= */}
          {activeTab === 'prompt' && (
            <div className="space-y-5 max-w-4xl animate-in fade-in duration-200 font-mono text-xs">
              <div className="p-5 rounded-lg bg-[#101216] border border-[#1B1E26] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">System Prompt Engineering Studio</h3>
                    <p className="text-xs text-[#949AA8]">
                      Tune LLM instructions, formatting constraints, and grounding behavior
                    </p>
                  </div>
                  <span className="text-[11px] text-[#606675]">
                    ~{Math.round((settings.system_prompt || '').length / 4)} tokens
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="flex gap-2 pt-1">
                  {[
                    {
                      name: 'FAQ Assistant',
                      prompt:
                        'You are an intelligent, helpful, and concise AI assistant for this Discord server. Always provide accurate answers grounded in verified server documentation.',
                    },
                    {
                      name: 'Technical Support Specialist',
                      prompt:
                        'You are a senior technical specialist for this community. Provide bullet-pointed, code-accurate explanations. When documentation lacks the answer, state that clearly.',
                    },
                    {
                      name: 'Concise Mode',
                      prompt:
                        'You are a fast FAQ assistant. Keep all responses under 3 sentences unless explicitly asked for technical code examples.',
                    },
                  ].map((p) => (
                    <button
                      key={p.name}
                      onClick={() => {
                        setSettings({ ...settings, system_prompt: p.prompt });
                        setHasUnsavedChanges(true);
                        showToast(`Applied preset: ${p.name}`);
                      }}
                      className="px-2.5 py-1 rounded bg-[#1C2028] border border-[#2E3340] text-[#EDEDED] hover:bg-[#252B38] text-[11px] transition"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={6}
                  value={settings.system_prompt || ''}
                  onChange={(e) => {
                    setSettings({ ...settings, system_prompt: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-3.5 rounded bg-[#0A0B0D] border border-[#1B1E26] text-white focus:outline-none focus:border-[#323846] leading-relaxed text-xs"
                />

                {/* RAG Cosine Threshold Slider */}
                <div className="p-3 rounded bg-[#0A0B0D] border border-[#1B1E26] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold">Minimum RAG Cosine Similarity Threshold</span>
                    <span className="text-emerald-400 font-bold">{settings.rag_threshold}</span>
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
                    className="w-full h-1.5 bg-[#1B1E26] rounded cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#606675]">
                    <span>0.30 (Permissive)</span>
                    <span className="text-emerald-400">0.65 (Recommended)</span>
                    <span>0.90 (Exact Match)</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="px-4 py-2 rounded bg-[#EDEDED] hover:bg-white text-black font-semibold transition"
                  >
                    {savingSettings ? 'Saving...' : 'Save Prompt & Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: AUDIT & QUERY LOGS */}
          {/* ========================================================================= */}
          {activeTab === 'logs' && (
            <div className="space-y-4 animate-in fade-in duration-200 font-mono text-xs">
              <div className="p-4 rounded-lg bg-[#101216] border border-[#1B1E26] flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Full Query Audit Trail</h3>
                  <p className="text-[11px] text-[#606675]">
                    Logged database records of every user message processed via RAG pipeline
                  </p>
                </div>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'query_audit_logs.json';
                    a.click();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1C2028] border border-[#2E3340] text-white hover:bg-[#252B38] text-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
              </div>

              <div className="rounded-lg bg-[#101216] border border-[#1B1E26] overflow-hidden">
                {logs.length === 0 ? (
                  <div className="p-12 text-center text-[#606675]">No query activity recorded.</div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#0E1014] text-[10px] text-[#606675] uppercase border-b border-[#1B1E26]">
                        <th className="py-2.5 px-4 font-semibold">User ID</th>
                        <th className="py-2.5 px-4 font-semibold">Query Text</th>
                        <th className="py-2.5 px-4 font-semibold">Provider</th>
                        <th className="py-2.5 px-4 font-semibold">Latency</th>
                        <th className="py-2.5 px-4 font-semibold">Chunks</th>
                        <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#181B22]">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#14161C] transition">
                          <td className="py-2.5 px-4 text-[#949AA8]">{log.user_id}</td>
                          <td className="py-2.5 px-4 text-white max-w-md truncate">"{log.query_text}"</td>
                          <td className="py-2.5 px-4">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[#1C2028] text-orange-400 border border-[#2E3340]">
                              {log.provider_used}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-[#EDEDED]">{log.latency_ms}ms</td>
                          <td className="py-2.5 px-4 text-emerald-400">{log.chunks_retrieved}</td>
                          <td className="py-2.5 px-4 text-[#606675]">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
