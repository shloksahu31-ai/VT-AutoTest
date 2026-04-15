"use client";

import React, { useState, useEffect } from 'react';
import { Plus, X, Search, Check, FileText, Loader2, Save, Clock, Calendar, Zap, Shield } from 'lucide-react';
import ObsidianCard from './ObsidianCard';

interface TestFile {
  name: string;
  path: string;
}

interface SuiteCombinatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const SuiteCombinator: React.FC<SuiteCombinatorProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableTests, setAvailableTests] = useState<TestFile[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [schedule, setSchedule] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/tests')
        .then(res => res.json())
        .then(data => {
          setAvailableTests(data.files || []);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch tests:', err);
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleTest = (path: string) => {
    setSelectedTests(prev => 
      prev.includes(path) ? prev.filter(t => t !== path) : [...prev, path]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || selectedTests.length === 0) return;

    setSaving(true);
    try {
      const response = await fetch('/api/suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          testFiles: selectedTests.map(path => ({ path })),
          schedule: isScheduled ? schedule : null,
          isScheduled,
        }),
      });

      if (response.ok) {
        onClose();
      } else {
        const error = await response.json();
        alert(`ERR: ${error.error}`);
      }
    } catch (err) {
      console.error('System Error:', err);
    } finally {
      setSaving(false);
    }
  };

  const filteredTests = availableTests.filter(test => 
    test.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-fluid">
      <div className="w-full max-w-4xl h-[85vh] flex flex-col">
        <ObsidianCard className="flex flex-col h-full border-indigo-500/20 shadow-[0_0_100px_rgba(79,70,229,0.1)]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/2">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
                <Zap size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter text-white uppercase">Provision Tactical Suite</h2>
                <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase mt-0.5">Configuration Module 4.0 // Deployment Ready</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 transition-all rounded-xl border border-white/5 bg-white/2 text-white/40 hover:text-white hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-thin scrollbar-thumb-white/10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Meta Inputs */}
                <div className="space-y-8">
                  <div className="group">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 group-focus-within:text-indigo-400 transition-colors">
                      Suite Identification
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. CORE-RECRUITMENT-PATH"
                      className="w-full bg-white/2 border border-white/5 rounded-xl px-5 py-4 text-sm font-bold text-white placeholder:text-white/5 focus:border-indigo-500/40 outline-none transition-all tracking-wide"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 group-focus-within:text-indigo-400 transition-colors">
                      Intelligence Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide operational context..."
                      className="w-full bg-white/2 border border-white/5 rounded-xl px-5 py-4 text-sm font-medium text-white/80 h-32 resize-none focus:border-indigo-500/40 outline-none transition-all"
                    />
                  </div>

                  {/* Scheduling Toggle */}
                  <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-indigo-400" />
                        <span className="text-xs font-black text-white uppercase tracking-widest">Automation Routine</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsScheduled(!isScheduled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                          isScheduled ? 'bg-indigo-500' : 'bg-white/10'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isScheduled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {isScheduled && (
                      <div className="animate-fluid space-y-4 pt-4 border-t border-white/5">
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Every Minute', value: '* * * * *' },
                            { label: 'Every Hour', value: '0 * * * *' },
                            { label: 'Daily (9 AM)', value: '0 9 * * *' },
                            { label: 'Weekly (Mon)', value: '0 9 * * 1' },
                          ].map((preset) => (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => setSchedule(preset.value)}
                              className={`px-3 py-2 text-[9px] font-black rounded-lg border transition-all uppercase tracking-tighter
                                ${schedule === preset.value
                                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                                  : 'bg-black/40 border-white/5 text-text-muted hover:border-white/20'}`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={schedule}
                          onChange={(e) => setSchedule(e.target.value)}
                          placeholder="Precision Cron Expression"
                          className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-indigo-300 focus:border-indigo-500/40 outline-none transition-all"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Test Selection */}
                <div className="flex flex-col h-[500px]">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Select Deployment Nodes</label>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-black tracking-widest">{selectedTests.length} LOADED</span>
                  </div>
                  
                  <div className="relative mb-6 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="LOCATE TEST FILES..."
                      className="w-full bg-white/2 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-white placeholder:text-white/10 focus:border-indigo-500/30 outline-none transition-all"
                    />
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 pr-4 scrollbar-thin scrollbar-thumb-white/10 selection:bg-indigo-500/20">
                    {loading ? (
                      <div className="flex items-center justify-center h-48 opacity-20">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    ) : filteredTests.length === 0 ? (
                      <div className="text-center py-20 opacity-20 text-[10px] font-bold uppercase tracking-widest italic">// No matching nodes detected</div>
                    ) : (
                      filteredTests.map((test) => {
                        const isSelected = selectedTests.includes(test.path);
                        return (
                          <div
                            key={test.path}
                            onClick={() => toggleTest(test.path)}
                            className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${
                              isSelected 
                                ? 'bg-indigo-500/10 border-indigo-500/30' 
                                : 'bg-white/1 border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-black/40 text-text-muted'}`}>
                              <FileText size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate uppercase tracking-tighter ${isSelected ? 'text-white' : 'text-text-muted group-hover:text-white'}`}>
                                {test.name.replace('.spec.ts', '')}
                              </p>
                              <p className="text-[9px] font-mono text-white/10 truncate mt-0.5">{test.path}</p>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                                <Check size={12} strokeWidth={4} />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-8 border-t border-white/5 bg-black/40 flex justify-between items-center bg-white/1">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold uppercase tracking-widest">
                  <Shield size={12} />
                  SECURE PROTOCOL
                </div>
              </div>
              
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-white hover:bg-white/5 transition-all"
                >
                  Terminate
                </button>
                <button
                  type="submit"
                  disabled={saving || !name || selectedTests.length === 0}
                  className="btn-obsidian px-12 h-12 shadow-indigo-500/30"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                  INITIATE DEPLOYMENT
                </button>
              </div>
            </div>
          </form>
        </ObsidianCard>
      </div>
    </div>
  );
};

export default SuiteCombinator;
