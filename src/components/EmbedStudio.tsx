'use client';

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sparkles,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Check,
  Copy,
  Layers,
  Code,
  Sliders,
  Terminal,
} from 'lucide-react';

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

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
  fields: EmbedField[];
}

const TEMPLATE_METADATA: Record<string, { label: string; icon: string; vars: string[] }> = {
  ticket_welcome: {
    label: 'Ticket Welcome Embed',
    icon: '🎫',
    vars: ['{user.mention}', '{user.tag}', '{ticket_number}', '{category}', '{subject}', '{description}'],
  },
  level_up: {
    label: 'Level-Up Celebration',
    icon: '🎉',
    vars: ['{user.mention}', '{user.tag}', '{level}', '{total_xp}', '{rank}'],
  },
  voicemaster_control: {
    label: 'VoiceMaster Room Controller',
    icon: '🔊',
    vars: ['{user.mention}', '{user.tag}', '{room_name}', '{user_limit}'],
  },
  security_alert: {
    label: 'Sentinel Forensics Alert',
    icon: '🚨',
    vars: ['{action_type}', '{perpetrator_tag}', '{perpetrator_id}', '{enforcement}'],
  },
  broadcast: {
    label: 'Broadcast & Announcements',
    icon: '📢',
    vars: ['{content}', '{author}', '{platform}', '{url}'],
  },
};

const DISCORD_PALETTES = [
  { name: 'Blurple', hex: '#5865F2' },
  { name: 'Emerald', hex: '#00D26A' },
  { name: 'Crimson', hex: '#ED4245' },
  { name: 'Gold', hex: '#FFD700' },
  { name: 'Cyan', hex: '#00B0F4' },
  { name: 'Fuchsia', hex: '#EB459E' },
  { name: 'Dark Slate', hex: '#2B2D31' },
];

export default function EmbedStudio({ showToast }: { showToast: (msg: string, type?: 'ok' | 'err') => void }) {
  const [templates, setTemplates] = useState<Record<string, EmbedTemplate>>({});
  const [selectedKey, setSelectedKey] = useState<string>('ticket_welcome');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Active form state
  const [activeTemplate, setActiveTemplate] = useState<EmbedTemplate | null>(null);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/embeds');
      const data = await res.json();
      if (data.success && data.templates) {
        setTemplates(data.templates);
        if (data.templates[selectedKey]) {
          setActiveTemplate(data.templates[selectedKey]);
        }
      }
    } catch {
      showToast('Failed to load embed templates', 'err');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleSelectTemplate = (key: string) => {
    setSelectedKey(key);
    if (templates[key]) {
      setActiveTemplate(templates[key]);
    }
  };

  const handleSave = async () => {
    if (!activeTemplate) return;
    try {
      setSaving(true);
      const res = await fetch('/api/embeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeTemplate),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Saved custom embed for ${TEMPLATE_METADATA[selectedKey]?.label || selectedKey}!`);
        setTemplates({ ...templates, [selectedKey]: activeTemplate });
      } else {
        showToast(data.error || 'Failed to save template', 'err');
      }
    } catch {
      showToast('Failed to save embed template', 'err');
    } finally {
      setSaving(false);
    }
  };

  const addField = () => {
    if (!activeTemplate) return;
    setActiveTemplate({
      ...activeTemplate,
      fields: [...activeTemplate.fields, { name: 'New Field', value: 'Field Value', inline: true }],
    });
  };

  const updateField = (index: number, key: keyof EmbedField, val: any) => {
    if (!activeTemplate) return;
    const newFields = [...activeTemplate.fields];
    newFields[index] = { ...newFields[index], [key]: val };
    setActiveTemplate({ ...activeTemplate, fields: newFields });
  };

  const removeField = (index: number) => {
    if (!activeTemplate) return;
    setActiveTemplate({
      ...activeTemplate,
      fields: activeTemplate.fields.filter((_, i) => i !== index),
    });
  };

  const insertVariable = (variable: string) => {
    if (!activeTemplate) return;
    setActiveTemplate({
      ...activeTemplate,
      description: activeTemplate.description + ` ${variable}`,
    });
    showToast(`Appended ${variable} to description`);
  };

  if (loading || !activeTemplate) {
    return (
      <div className="flex items-center justify-center h-64 text-[#606675]">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        <span className="font-mono text-xs">Loading Embed Design Studio...</span>
      </div>
    );
  }

  // Simulated variable replacements for live preview
  const previewTitle = activeTemplate.title
    .replace(/{ticket_number}/g, '4291')
    .replace(/{category}/g, 'Bug Report')
    .replace(/{level}/g, '15')
    .replace(/{user.mention}/g, '@SpyGamer')
    .replace(/{user.tag}/g, 'SpyGamer#0001');

  const previewDesc = activeTemplate.description
    .replace(/{user.mention}/g, '@SpyGamer')
    .replace(/{user.tag}/g, 'SpyGamer#0001')
    .replace(/{level}/g, '15')
    .replace(/{total_xp}/g, '14,250')
    .replace(/{rank}/g, '1')
    .replace(/{subject}/g, 'Issue with world teleport')
    .replace(/{description}/g, 'Player cannot teleport across custom container worlds');

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#12141A] border border-[#232733] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center shrink-0">
            <Palette className="w-6 h-6 text-pink-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-white tracking-tight">Discord Embed & Message Studio</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border bg-pink-500/10 text-pink-400 border-pink-500/30">
                WYSIWYG BUILDER
              </span>
            </div>
            <p className="text-xs text-[#949AA8] mt-1">
              Full Carl-bot/Ticket-Tool style customization: custom embed titles, authors, hex color bars, dynamic variable pills, and live 1:1 Discord preview.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadTemplates}
            className="px-3 py-2 bg-[#1A1D24] hover:bg-[#232733] text-[#EDEDED] border border-[#2E3340] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Deploy Embed Style'}
          </button>
        </div>
      </div>

      {/* Template Selector Rail */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {Object.entries(TEMPLATE_METADATA).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => handleSelectTemplate(key)}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 whitespace-nowrap border transition-all ${
              selectedKey === key
                ? 'bg-[#1A1D24] text-white border-pink-500/50 shadow-lg shadow-pink-500/5'
                : 'bg-[#12141A] text-[#949AA8] border-[#232733] hover:text-white hover:bg-[#161922]'
            }`}
          >
            <span>{meta.icon}</span>
            <span>{meta.label}</span>
          </button>
        ))}
      </div>

      {/* Main Grid: Left Controls Form, Right Live Discord Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Form (7 cols) */}
        <div className="lg:col-span-7 bg-[#12141A] border border-[#232733] rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#232733] pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-pink-400" />
              <h3 className="text-sm font-semibold text-white">
                Customize {TEMPLATE_METADATA[selectedKey]?.label}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#606675]">Key: {selectedKey}</span>
          </div>

          {/* Color Bar Customization */}
          <div className="space-y-2">
            <label className="text-xs text-[#949AA8] block">Left Accent Border Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={activeTemplate.color}
                onChange={(e) => setActiveTemplate({ ...activeTemplate, color: e.target.value })}
                className="w-9 h-9 rounded cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={activeTemplate.color}
                onChange={(e) => setActiveTemplate({ ...activeTemplate, color: e.target.value })}
                className="w-28 bg-[#1A1D24] border border-[#2E3340] rounded px-2.5 py-1.5 text-xs font-mono text-white uppercase focus:outline-none focus:border-pink-500"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {DISCORD_PALETTES.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setActiveTemplate({ ...activeTemplate, color: p.hex })}
                    title={p.name}
                    className="w-5 h-5 rounded-full border border-[#2E3340] transition-transform hover:scale-110"
                    style={{ backgroundColor: p.hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Author Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#949AA8] block mb-1">Author Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. SpyGaming Support"
                value={activeTemplate.author_name || ''}
                onChange={(e) => setActiveTemplate({ ...activeTemplate, author_name: e.target.value })}
                className="w-full bg-[#1A1D24] border border-[#2E3340] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
              />
            </div>
            <div>
              <label className="text-xs text-[#949AA8] block mb-1">Author Icon URL (Optional)</label>
              <input
                type="text"
                placeholder="https://...png"
                value={activeTemplate.author_icon_url || ''}
                onChange={(e) => setActiveTemplate({ ...activeTemplate, author_icon_url: e.target.value })}
                className="w-full bg-[#1A1D24] border border-[#2E3340] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Title & Title URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#949AA8] block mb-1">Embed Title</label>
              <input
                type="text"
                value={activeTemplate.title}
                onChange={(e) => setActiveTemplate({ ...activeTemplate, title: e.target.value })}
                className="w-full bg-[#1A1D24] border border-[#2E3340] rounded px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-pink-500"
              />
            </div>
            <div>
              <label className="text-xs text-[#949AA8] block mb-1">Title Click URL (Optional)</label>
              <input
                type="text"
                placeholder="https://spygaming.org"
                value={activeTemplate.title_url || ''}
                onChange={(e) => setActiveTemplate({ ...activeTemplate, title_url: e.target.value })}
                className="w-full bg-[#1A1D24] border border-[#2E3340] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Description & Variable Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-[#949AA8]">Description Body (Markdown Supported)</label>
              <span className="text-[10px] text-[#606675]">Click pills below to append</span>
            </div>

            {/* Variable Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(TEMPLATE_METADATA[selectedKey]?.vars || []).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="px-2 py-0.5 rounded bg-[#1A1D24] hover:bg-[#232733] border border-[#2E3340] text-[10px] font-mono text-pink-300 transition-colors"
                >
                  +{v}
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              value={activeTemplate.description}
              onChange={(e) => setActiveTemplate({ ...activeTemplate, description: e.target.value })}
              className="w-full bg-[#1A1D24] border border-[#2E3340] rounded p-3 text-xs text-white focus:outline-none focus:border-pink-500 leading-relaxed font-sans"
            />
          </div>

          {/* Fields Builder */}
          <div className="space-y-3 pt-3 border-t border-[#232733]">
            <div className="flex items-center justify-between">
              <label className="text-xs text-[#949AA8] font-semibold">Custom Embed Fields ({activeTemplate.fields.length})</label>
              <button
                type="button"
                onClick={addField}
                className="px-2.5 py-1 bg-[#1A1D24] hover:bg-[#232733] border border-[#2E3340] rounded text-[11px] text-pink-300 font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Field
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {activeTemplate.fields.map((f, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#161922] border border-[#232733] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      placeholder="Field Name"
                      value={f.name}
                      onChange={(e) => updateField(i, 'name', e.target.value)}
                      className="flex-1 bg-[#1A1D24] border border-[#2E3340] rounded px-2.5 py-1 text-xs text-white font-medium"
                    />
                    <label className="flex items-center gap-1.5 text-[11px] text-[#949AA8] shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={f.inline ?? true}
                        onChange={(e) => updateField(i, 'inline', e.target.checked)}
                        className="rounded accent-pink-500"
                      />
                      <span>Inline</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeField(i)}
                      className="text-[#606675] hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Field Value (supports variables)"
                    value={f.value}
                    onChange={(e) => updateField(i, 'value', e.target.value)}
                    className="w-full bg-[#1A1D24] border border-[#2E3340] rounded px-2.5 py-1 text-xs text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Footer & Timestamp */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#232733]">
            <div>
              <label className="text-xs text-[#949AA8] block mb-1">Footer Text</label>
              <input
                type="text"
                placeholder="e.g. SpyGaming Enterprise Hub"
                value={activeTemplate.footer_text || ''}
                onChange={(e) => setActiveTemplate({ ...activeTemplate, footer_text: e.target.value })}
                className="w-full bg-[#1A1D24] border border-[#2E3340] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="show_timestamp"
                checked={activeTemplate.show_timestamp}
                onChange={(e) => setActiveTemplate({ ...activeTemplate, show_timestamp: e.target.checked })}
                className="w-4 h-4 rounded accent-pink-500 cursor-pointer"
              />
              <label htmlFor="show_timestamp" className="text-xs text-white cursor-pointer select-none">
                Include Real-time Discord Timestamp
              </label>
            </div>
          </div>
        </div>

        {/* Live Discord Dark Mode Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#949AA8]">
            <Eye className="w-4 h-4 text-pink-400" />
            <span>1:1 Native Discord Dark Mode Preview</span>
          </div>

          {/* Discord Message Container */}
          <div className="p-4 rounded-xl bg-[#313338] border border-[#3f4147] space-y-2 text-[#dbdee1] shadow-xl">
            {/* Discord Message Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center font-bold text-white shrink-0 text-sm">
                SG
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm hover:underline cursor-pointer">
                    SpyGaming Bot
                  </span>
                  <span className="px-1 py-0.2 rounded bg-[#5865F2] text-white text-[9px] font-bold">
                    BOT
                  </span>
                  <span className="text-[10px] text-[#949ba4]">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>

            {/* Discord Embed Box */}
            <div
              className="ml-12 rounded-r-md bg-[#2B2D31] p-4 text-xs space-y-2 border-l-4 shadow-sm"
              style={{ borderColor: activeTemplate.color }}
            >
              {/* Embed Author */}
              {activeTemplate.author_name && (
                <div className="flex items-center gap-2 text-[11px] font-semibold text-white">
                  {activeTemplate.author_icon_url && (
                    <img
                      src={activeTemplate.author_icon_url}
                      alt="icon"
                      className="w-4 h-4 rounded-full"
                      onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                    />
                  )}
                  <span>{activeTemplate.author_name}</span>
                </div>
              )}

              {/* Embed Title */}
              <div className="font-bold text-sm text-white hover:underline cursor-pointer">
                {previewTitle}
              </div>

              {/* Embed Description */}
              <div className="text-xs text-[#dbdee1] whitespace-pre-wrap leading-relaxed">
                {previewDesc}
              </div>

              {/* Embed Fields (2-column responsive inline grid) */}
              {activeTemplate.fields.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {activeTemplate.fields.map((f, i) => (
                    <div
                      key={i}
                      className={`space-y-0.5 ${f.inline ? 'col-span-1' : 'col-span-2'}`}
                    >
                      <div className="font-semibold text-[11px] text-[#949ba4]">{f.name}</div>
                      <div className="text-white text-xs font-mono">{f.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Embed Footer & Timestamp */}
              {(activeTemplate.footer_text || activeTemplate.show_timestamp) && (
                <div className="pt-2 flex items-center gap-2 text-[10px] text-[#949ba4] border-t border-[#35373c]/50">
                  {activeTemplate.footer_icon_url && (
                    <img
                      src={activeTemplate.footer_icon_url}
                      alt="icon"
                      className="w-3.5 h-3.5 rounded-full"
                      onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                    />
                  )}
                  <span>{activeTemplate.footer_text}</span>
                  {activeTemplate.footer_text && activeTemplate.show_timestamp && <span>•</span>}
                  {activeTemplate.show_timestamp && <span>Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
