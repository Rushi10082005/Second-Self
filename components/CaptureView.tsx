'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bookmark,
  FileText,
  CheckCircle2,
  Sparkles,
  Inbox,
  Mic,
  Square,
  Loader2,
  Volume2,
  UploadCloud,
  FileUp,
  GitCommit,
} from 'lucide-react';

interface CaptureViewProps {
  apiKey?: string;
  githubToken?: string;
  githubRepo?: string;
}

export default function CaptureView({
  apiKey = '',
  githubToken = '',
  githubRepo = 'Rushi10082005/Second-Self',
}: CaptureViewProps) {
  const [captureType, setCaptureType] = useState<'note' | 'link'>('note');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // File drag & drop states
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFileName, setDroppedFileName] = useState<string | null>(null);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleFileRead = async (file: File) => {
    try {
      setDroppedFileName(file.name);
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (['md', 'txt', 'csv', 'json', 'py', 'ts', 'js'].includes(extension || '')) {
        const text = await file.text();
        setContent((prev) => (prev ? `${prev}\n\n# Imported from ${file.name}:\n\n${text}` : text));
        setVoiceNotice(`📄 Imported ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
        setTimeout(() => setVoiceNotice(null), 5000);
      } else if (extension === 'pdf') {
        // PDF client-side text chunking
        const text = await file.text();
        // Extract basic printable ASCII string sequences from PDF stream
        const readableMatch = text.match(/[A-Za-z0-9\s.,!?:;'"()-]{5,}/g);
        const extracted = readableMatch ? readableMatch.join(' ').slice(0, 3000) : '';
        const bodyText = extracted || `[Document content: ${file.name} - ${(file.size / 1024).toFixed(1)} KB]`;
        setContent((prev) => (prev ? `${prev}\n\n# Document ${file.name}\n\n${bodyText}` : bodyText));
        setVoiceNotice(`📄 Extracted text from PDF: ${file.name}`);
        setTimeout(() => setVoiceNotice(null), 5000);
      } else {
        alert('Unsupported file format. Please upload Markdown (.md), text (.txt), PDF, CSV, or JSON.');
      }
    } catch (err: any) {
      alert(`Error reading file: ${err?.message}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleFileRead(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleFileRead(file);
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Voice recording is not supported in this browser environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        await handleTranscribeAudio(audioBlob);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      setVoiceNotice(null);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert(`Microphone access error: ${err?.message || 'Permission denied'}`);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const handleTranscribeAudio = async (audioBlob: Blob) => {
    setTranscribing(true);
    try {
      const formData = new FormData();
      const file = new File([audioBlob], 'voice-memo.webm', { type: audioBlob.type });
      formData.append('file', file);
      if (apiKey) formData.append('apiKey', apiKey);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transcription failed');

      if (data.text) {
        setContent((prev) => (prev ? `${prev}\n\n${data.text}` : data.text));
        setVoiceNotice('✨ Voice note transcribed in ~350ms via Groq Whisper!');
        setTimeout(() => setVoiceNotice(null), 6000);
      }
    } catch (err: any) {
      alert(`Transcription error: ${err?.message}`);
    } finally {
      setTranscribing(false);
      setRecordingSeconds(0);
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payloadContent = captureType === 'note' ? content.trim() : `${url.trim()} — ${content.trim()}`;
    if (!payloadContent) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: captureType,
          content: payloadContent,
          source: captureType === 'link' ? url.trim() : 'multimodal_capture',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to capture');

      let gitMsg = '';
      // If GitHub Token configured, sync inbox capture to GitHub repository
      if (githubToken && data.id) {
        try {
          const syncRes = await fetch('/api/sync/github', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              path: `wiki/inbox/${data.id}.md`,
              content: `---\ntitle: "Capture ${data.id.slice(0, 8)}"\ncreated: "${new Date().toISOString()}"\nsource: "${captureType}"\n---\n\n${payloadContent}`,
              message: `feat(inbox): capture ${data.id.slice(0, 8)} via SecondSelf`,
              token: githubToken,
              repo: githubRepo,
            }),
          });
          if (syncRes.ok) {
            gitMsg = ' & committed to GitHub repository';
          }
        } catch {
          // Non-blocking GitHub sync
        }
      }

      setSuccessMsg(`Capture successfully saved to SecondSelf inbox${gitMsg}!`);
      setContent('');
      setUrl('');
      setDroppedFileName(null);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(`Error saving capture: ${err?.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto h-[calc(100dvh-140px)] min-h-[460px] md:h-[760px] flex flex-col justify-center overflow-y-auto p-1 sm:p-4">
      <div className="glass-panel p-4 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xl transition-colors">
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500 dark:text-sky-400 shrink-0">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Quick Capture Inbox
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Text thoughts, file drag-and-drop, web links, or instant voice memos.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
            <span>Groq Whisper Active</span>
          </div>
        </div>

        {/* Capture Type Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-canvas-card border border-slate-200 dark:border-white/5 rounded-xl mb-4 sm:mb-5">
          <button
            type="button"
            onClick={() => setCaptureType('note')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
              captureType === 'note'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Note / Thought / File</span>
          </button>

          <button
            type="button"
            onClick={() => setCaptureType('link')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
              captureType === 'link'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Bookmark</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 sm:mb-5 p-3 sm:p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Voice Transcribed Notice */}
        {voiceNotice && (
          <div className="mb-4 sm:mb-5 p-3 sm:p-3.5 bg-sky-500/15 border border-sky-500/30 rounded-xl flex items-center gap-2.5 text-xs text-sky-700 dark:text-sky-300 animate-in fade-in duration-200">
            <Volume2 className="w-4 h-4 shrink-0 text-sky-500" />
            <span>{voiceNotice}</span>
          </div>
        )}

        {/* Voice Recording HUD */}
        {isRecording ? (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-red-600 dark:text-red-400">
                  Recording Voice Memo...
                </span>
                <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                  {formatTimer(recordingSeconds)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-red-500/20 active:scale-95 transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Done</span>
              </button>
            </div>
          </div>
        ) : transcribing ? (
          <div className="mb-4 p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center gap-2.5 text-xs text-sky-700 dark:text-sky-300 animate-in fade-in">
            <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
            <span>Transcribing with Groq Whisper Large v3 Turbo (&lt;400ms)...</span>
          </div>
        ) : null}

        {/* Drag and Drop Zone */}
        {captureType === 'note' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mb-3.5 p-3.5 rounded-xl border-2 border-dashed transition-all cursor-pointer flex items-center justify-between gap-3 ${
              isDragging
                ? 'border-sky-500 bg-sky-500/10 scale-[1.01]'
                : 'border-slate-200 dark:border-white/10 hover:border-sky-500/50 bg-slate-50 dark:bg-white/[0.01]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <UploadCloud className="w-4 h-4 text-sky-500 shrink-0" />
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                {droppedFileName ? (
                  <span className="font-semibold text-sky-600 dark:text-sky-400">
                    File loaded: {droppedFileName}
                  </span>
                ) : (
                  <span>
                    Drag & drop <strong>.md, .txt, .pdf, .csv</strong> or click to upload
                  </span>
                )}
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
              Browse
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt,.pdf,.csv,.json,.py,.ts"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {captureType === 'link' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                URL Address
              </label>
              <input
                type="url"
                required
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-canvas-card border border-slate-200 dark:border-white/10 rounded-xl text-[16px] sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                {captureType === 'note' ? 'Note Content / Idea' : 'Commentary (Optional)'}
              </label>

              {captureType === 'note' && !isRecording && !transcribing && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 border border-sky-500/20 transition-all active:scale-95"
                  title="Record voice note with Groq Whisper"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Voice Memo</span>
                </button>
              )}
            </div>

            <textarea
              required={captureType === 'note'}
              rows={4}
              placeholder={
                captureType === 'note'
                  ? 'Enter ideas, meeting takeaways, or click Voice Memo / Drop File...'
                  : 'Add brief context on why you saved this link...'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-canvas-card border border-slate-200 dark:border-white/10 rounded-xl text-[16px] sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || isRecording || transcribing}
            className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 active:scale-[0.99] disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all min-h-[44px]"
          >
            {submitting ? (
              <span>Saving capture...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Save to Second Brain</span>
              </>
            )}
          </button>
        </form>

        {/* Pipeline Info Card */}
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Autonomous Multimodal Pipeline
            </div>
            {githubToken && (
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <GitCommit className="w-3 h-3" />
                <span>GitHub Auto-Sync On</span>
              </div>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Spoken voice notes, uploaded files, or text entries are automatically categorized into <strong>PARA</strong> via Groq Llama 3.3, linked into your <strong>knowledge graph</strong>, and indexed for instant <strong>RAG queries</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
