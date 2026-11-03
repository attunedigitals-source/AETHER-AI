import React, { useState } from 'react';
import { Check, Copy, Download, FileText, FileCode } from 'lucide-react';
import { downloadFile, formatBytes } from '../../lib/utils';

interface CodeBlockProps {
  language?: string;
  code: string;
  meta?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, meta }) => {
  const [copied, setCopied] = useState(false);

  // Extract clean language and filename
  let rawLang = (language || 'text').replace(/^language-/, '').trim();
  let filename: string | null = null;
  let isDeliverableFile = false;

  // Check language for :filename or :filename=
  // e.g. text:filename=script_deep_time.txt or text:script_human_origin.txt
  if (rawLang.includes(':')) {
    const parts = rawLang.split(':');
    rawLang = parts[0];
    const rest = parts.slice(1).join(':').replace(/^filename=["']?/, '').replace(/["']?$/, '').trim();
    if (rest) {
      filename = rest;
      isDeliverableFile = true;
    }
  }

  // Check meta e.g. filename="script.txt"
  if (!filename && meta) {
    const fnMatch = meta.match(/filename=["']?([^"'\s]+)["']?/i) || meta.match(/title=["']?([^"'\s]+)["']?/i);
    if (fnMatch) {
      filename = fnMatch[1];
      isDeliverableFile = true;
    } else if (meta.trim().match(/^[\w\.-]+\.[a-zA-Z0-9]+$/)) {
      filename = meta.trim();
      isDeliverableFile = true;
    }
  }

  // Check first line of code for filename indicator
  // e.g. "// filename: script.txt" or "# script_origins.txt" or "script_origins.txt"
  if (!filename && code) {
    const firstLine = code.split('\n')[0].trim();
    const commentMatch = firstLine.match(/^(?:\/\/|#|\/\*|<!--)?\s*(?:filename:\s*|file:\s*)?([a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+)\s*(?:\*\/|-->)?$/i);
    if (commentMatch) {
      filename = commentMatch[1];
      isDeliverableFile = true;
    } else if (firstLine.match(/^(script|image_prompts|prompts|narration)_[a-zA-Z0-9_]+\.(txt|md)$/i)) {
      filename = firstLine;
      isDeliverableFile = true;
    }
  }

  // Fallback filename based on language or content
  const cleanLang = rawLang || 'text';
  if (!filename) {
    if (cleanLang === 'typescript' || cleanLang === 'ts') filename = 'snippet.ts';
    else if (cleanLang === 'javascript' || cleanLang === 'js') filename = 'snippet.js';
    else if (cleanLang === 'python' || cleanLang === 'py') filename = 'script.py';
    else if (cleanLang === 'html') filename = 'index.html';
    else if (cleanLang === 'css') filename = 'styles.css';
    else if (cleanLang === 'json') filename = 'data.json';
    else if (cleanLang === 'markdown' || cleanLang === 'md') filename = 'document.md';
    else if (cleanLang === 'sql') filename = 'query.sql';
    else if (cleanLang === 'csv') filename = 'data.csv';
    else if (code.includes('[00:') || code.includes('Narration') || code.includes('Prompt')) {
      filename = 'script_deliverable.txt';
      isDeliverableFile = true;
    } else {
      filename = 'document.txt';
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleDownload = () => {
    const mimeType = filename?.endsWith('.json')
      ? 'application/json'
      : filename?.endsWith('.html')
      ? 'text/html'
      : filename?.endsWith('.csv')
      ? 'text/csv'
      : 'text/plain';

    downloadFile(code, filename || 'file.txt', mimeType);
  };

  const lines = code.trim().split('\n').length;
  const byteSize = new Blob([code]).size;

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-warm-200 dark:border-warm-800 bg-[#1e1e1e] text-warm-100 shadow-sm font-mono text-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#2d2d2d] border-b border-[#3d3d3d] select-none text-xs text-warm-300">
        <div className="flex items-center space-x-2.5 min-w-0">
          {isDeliverableFile || filename.endsWith('.txt') || filename.endsWith('.md') ? (
            <FileText className="w-4 h-4 text-claude-coral flex-shrink-0" />
          ) : (
            <FileCode className="w-4 h-4 text-claude-coral flex-shrink-0" />
          )}

          <span className="font-semibold text-white tracking-wide truncate max-w-[220px] sm:max-w-xs" title={filename}>
            {filename}
          </span>

          <span className="text-warm-500">•</span>
          <span className="text-warm-400 text-[11px] whitespace-nowrap">
            {lines} {lines === 1 ? 'line' : 'lines'} ({formatBytes(byteSize)})
          </span>

          {isDeliverableFile && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Downloadable File
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Prominent Download Button */}
          <button
            onClick={handleDownload}
            title={`Download ${filename}`}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-claude-coral hover:bg-claude-coral-hover text-white text-xs font-sans font-medium transition-all shadow-sm active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            title="Copy content"
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-[#3d3d3d] text-warm-300 hover:text-white transition-colors text-xs font-sans"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className="p-4 overflow-x-auto text-[13px] leading-relaxed max-h-[500px] overflow-y-auto">
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
