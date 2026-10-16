import React, { useState } from 'react';
import { BookOpen, Download, Trash2, Search, Filter, CheckCircle2, FileText, ChevronRight } from 'lucide-react';
import { holoAudio } from '../utils/audioFeedback.ts';

export interface NotebookEntry {
  id: string;
  timestamp: string;
  title: string;
  type: string;
  details: string;
  metrics?: any;
}

interface DigitalScienceNotebookProps {
  entries: NotebookEntry[];
  onDeleteEntry: (id: string) => void;
  onClearAll: () => void;
}

export const DigitalScienceNotebook: React.FC<DigitalScienceNotebookProps> = ({
  entries,
  onDeleteEntry,
  onClearAll,
}) => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [activeEntry, setActiveEntry] = useState<NotebookEntry | null>(entries[0] || null);

  const filtered = entries.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.details.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'ALL' || e.type.includes(selectedType);
    return matchesSearch && matchesType;
  });

  const exportAsMarkdown = () => {
    holoAudio.playVerifySuccess();
    const md = [
      '# Krypton Vision AI — Scientific Experiment Log',
      `Generated at: ${new Date().toISOString()}`,
      '',
      ...entries.map(
        (e) => `## ${e.title}\n- **Date:** ${e.timestamp}\n- **Type:** ${e.type}\n- **Details:** ${e.details}\n`
      ),
    ].join('\n');

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `krypton_science_notebook_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsJson = () => {
    holoAudio.playVerifySuccess();
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `krypton_experiments_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col lg:flex-row gap-4 bg-slate-950/70 p-4 rounded-xl border border-cyan-500/30 backdrop-blur-md">
      {/* Entry List Column */}
      <div className="w-full lg:w-96 rounded-xl border border-cyan-500/30 bg-slate-950 p-3 flex flex-col justify-between min-h-[420px]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-hud font-bold text-cyan-300">
                SCIENCE NOTEBOOK ({entries.length})
              </span>
            </div>
            <button
              onClick={() => {
                holoAudio.playHoloClick();
                onClearAll();
              }}
              className="text-[10px] text-rose-400 hover:underline"
            >
              Clear Log
            </button>
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search experiments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-cyan-500/20 pl-8 pr-3 py-1.5 text-xs text-cyan-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mb-3 text-[11px] font-mono">
            {['ALL', 'GEOMETRY', 'PHYSICS', 'PROOF'].map((type) => (
              <button
                key={type}
                onClick={() => {
                  holoAudio.playHoloClick();
                  setSelectedType(type);
                }}
                className={`px-2 py-0.5 rounded border transition-all ${
                  selectedType === type
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Entries list */}
          <div className="space-y-1.5 overflow-y-auto max-h-[260px] pr-1">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No recorded experiments matching query.
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    holoAudio.playHoloHover();
                    setActiveEntry(item);
                  }}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                    activeEntry?.id === item.id
                      ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(0,243,255,0.2)]'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-cyan-500/30'
                  }`}
                >
                  <div className="overflow-hidden pr-2">
                    <div className="text-xs font-hud font-bold truncate">{item.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {item.timestamp} · {item.type}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-cyan-400 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Export Buttons */}
        <div className="pt-3 border-t border-cyan-500/20 flex gap-2">
          <button
            onClick={exportAsMarkdown}
            className="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-hud font-semibold border border-cyan-500/30 flex items-center justify-center gap-1"
          >
            <FileText className="h-3.5 w-3.5" /> Export .MD
          </button>
          <button
            onClick={exportAsJson}
            className="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-hud font-semibold border border-cyan-500/30 flex items-center justify-center gap-1"
          >
            <Download className="h-3.5 w-3.5" /> Export JSON
          </button>
        </div>
      </div>

      {/* Active Entry Detail View */}
      <div className="flex-1 rounded-xl border border-cyan-500/30 bg-slate-900/80 p-4 flex flex-col justify-between">
        {activeEntry ? (
          <div>
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
              <div>
                <h3 className="text-base font-hud font-bold text-cyan-300">
                  {activeEntry.title}
                </h3>
                <div className="text-xs font-mono text-slate-400 mt-0.5">
                  Timestamp: {activeEntry.timestamp} | Category: {activeEntry.type}
                </div>
              </div>

              <button
                onClick={() => {
                  holoAudio.playHoloClick();
                  onDeleteEntry(activeEntry.id);
                  setActiveEntry(null);
                }}
                className="p-1.5 rounded bg-slate-800 text-rose-400 hover:bg-rose-950 border border-rose-500/30"
                title="Delete Entry"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg bg-slate-950/80 p-3 border border-cyan-500/20">
                <span className="text-xs font-hud text-cyan-400 block mb-1">
                  OBSERVED SUMMARY & PROOF LOG:
                </span>
                <p className="text-sm font-sans text-slate-200 leading-relaxed">
                  {activeEntry.details}
                </p>
              </div>

              {activeEntry.metrics && (
                <div className="rounded-lg bg-slate-950/80 p-3 border border-cyan-500/20">
                  <span className="text-xs font-hud text-cyan-400 block mb-1">
                    NUMERICAL RAW DATASET (JSON):
                  </span>
                  <pre className="text-xs font-mono text-emerald-400 overflow-x-auto max-h-48 p-2 rounded bg-slate-900">
                    {JSON.stringify(activeEntry.metrics, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
            Select an experiment entry on the left to inspect measurement records.
          </div>
        )}

        <div className="pt-3 border-t border-cyan-500/20 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Krypton Local Storage · Zero Cloud Sync Required</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> INTEGRITY PRESERVED
          </span>
        </div>
      </div>
    </div>
  );
};
