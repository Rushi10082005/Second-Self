'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, Cpu } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}: SettingsModalProps) {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKeyInput(apiKey);
  }, [apiKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(keyInput.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 bg-canvas-surface border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-semibold text-base sm:text-lg">
            <Key className="w-5 h-5" />
            <span>Settings & API Configuration</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Groq API Key (Optional Override)
            </label>
            <input
              type="password"
              placeholder="gsk_..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-canvas-card border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 text-[16px] sm:text-sm font-mono"
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Leave blank to use the server-configured environment key. If you provide your own key, it is stored only locally in your browser session.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
              <Cpu className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>Inference Engine: <strong>Groq Llama 3.3 70B Versatile</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <span>Vector Cache: <strong>384-d dense embeddings (all-MiniLM-L6-v2)</strong></span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-sky-500 hover:bg-sky-400 active:scale-95 rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center gap-1.5"
          >
            {saved ? 'Saved!' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
