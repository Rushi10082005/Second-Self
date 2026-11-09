'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, Cpu, GitCommit, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  githubToken?: string;
  onSaveGithubToken?: (token: string) => void;
  githubRepo?: string;
  onSaveGithubRepo?: (repo: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  githubToken = '',
  onSaveGithubToken,
  githubRepo = 'Rushi10082005/Second-Self',
  onSaveGithubRepo,
}: SettingsModalProps) {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [tokenInput, setTokenInput] = useState(githubToken);
  const [repoInput, setRepoInput] = useState(githubRepo);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKeyInput(apiKey);
  }, [apiKey]);

  useEffect(() => {
    setTokenInput(githubToken);
  }, [githubToken]);

  useEffect(() => {
    setRepoInput(githubRepo);
  }, [githubRepo]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(keyInput.trim());
    if (onSaveGithubToken) onSaveGithubToken(tokenInput.trim());
    if (onSaveGithubRepo) onSaveGithubRepo(repoInput.trim() || 'Rushi10082005/Second-Self');
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-5 sm:p-6 bg-canvas-surface border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-semibold text-base sm:text-lg">
            <Key className="w-5 h-5" />
            <span>Settings & Sync Integrations</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Section 1: Groq API Key */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Cpu className="w-4 h-4 text-sky-500" />
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Groq API Key (Inference Engine)
              </label>
            </div>
            <input
              type="password"
              placeholder="gsk_..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-canvas-card border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 text-[16px] sm:text-sm font-mono"
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Powers real-time Llama 3.3 70B streaming synthesis and Whisper Large v3 voice memos. Defaults to server environment variable if left blank.
            </p>
          </div>

          {/* Section 2: GitHub Two-Way Persistence */}
          <div className="pt-2 border-t border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-2 mb-1.5">
              <GitCommit className="w-4 h-4 text-emerald-500" />
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                GitHub Two-Way Auto-Sync (Cloud Persistence)
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Personal Access Token (with repo scope)
                </span>
                <input
                  type="password"
                  placeholder="ghp_... or github_pat_..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-canvas-card border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 text-[16px] sm:text-sm font-mono"
                />
              </div>

              <div>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Repository Name (owner/repo)
                </span>
                <input
                  type="text"
                  placeholder="Rushi10082005/Second-Self"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-canvas-card border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 text-[16px] sm:text-sm font-mono"
                />
              </div>

              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                💡 When configured, new thoughts and note edits created on Vercel are automatically committed directly to your GitHub repository in real time!
              </div>
            </div>
          </div>

          {/* Engine Specs */}
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
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved!</span>
              </>
            ) : (
              'Save Configuration'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
