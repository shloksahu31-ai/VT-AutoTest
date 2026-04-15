'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings2, 
  Bell, 
  Cpu, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import GlassCard from '@/components/GlassCard';

interface Setting {
  key: string;
  value: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Setting "${key}" updated successfully.` });
        fetchSettings();
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save setting.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const getSetting = (key: string) => settings.find(s => s.key === key)?.value || '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in pb-20">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
        <p className="text-text-secondary mt-1">Configure global runner behaviors and external integrations.</p>
      </header>

      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border animate-slide-in ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {/* Discord Notifications */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Discord Integration</h3>
              <p className="text-xs text-text-muted uppercase tracking-widest font-bold mt-0.5">Notifications</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Webhook URL</label>
              <div className="flex gap-3">
                <input 
                  type="password"
                  defaultValue={getSetting('discord_webhook_url')}
                  onBlur={(e) => updateSetting('discord_webhook_url', e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50 transition-all font-mono"
                />
                <button 
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-medium flex items-center gap-2"
                >
                  <ExternalLink size={16} />
                  Test
                </button>
              </div>
              <p className="text-xs text-text-muted mt-3 leading-relaxed">
                Receive real-time results in your Discord channel. If unset, the dashboard will fallback to the `.env` variable.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Runner Defaults */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Cpu size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Execution Defaults</h3>
              <p className="text-xs text-text-muted uppercase tracking-widest font-bold mt-0.5">Runner Engine</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Default Workers</label>
              <select 
                defaultValue={getSetting('default_parallel_workers') || '4'}
                onChange={(e) => updateSetting('default_parallel_workers', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50 transition-all"
              >
                {[1, 2, 4, 8, 16].map(n => <option key={n} value={String(n)}>{n} Parallel Instances</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Default Headed Mode</label>
              <select 
                defaultValue={getSetting('default_headed_mode') || 'false'}
                onChange={(e) => updateSetting('default_headed_mode', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50 transition-all"
              >
                <option value="true">Visible Browser (Headed)</option>
                <option value="false">Background (Headless)</option>
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Advanced / Security */}
        <GlassCard className="bg-rose-500/5 border-rose-500/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-lg font-bold text-rose-500">Advanced Telemetry</h3>
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
            <div>
              <p className="text-sm font-bold text-white">Full Trace Retention</p>
              <p className="text-xs text-text-secondary mt-1">Keep 100% of test traces in Neon storage (Increases DB usage)</p>
            </div>
            <button className="px-5 py-2 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-widest hover:bg-rose-500/30 transition-all border border-rose-500/30">
              Enable
            </button>
          </div>
        </GlassCard>
      </div>

      <footer className="pt-8 border-t border-white/5 flex justify-end gap-3">
        <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-all">
          Discard Changes
        </button>
        <button 
          onClick={() => setMessage({ type: 'success', text: 'All configurations persisted.' })}
          className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center gap-2 hover:bg-indigo-700 transition-all"
        >
          <Save size={18} />
          Save Global Engine
        </button>
      </footer>
    </div>
  );
}
