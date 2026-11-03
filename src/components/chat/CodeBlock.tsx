import React, { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { downloadFile } from '../../lib/utils';

interface CodeBlockProps {
  language?: string;
  code: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const cleanLang = (language || 'text').replace(/^language-/, '');

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
    const ext = cleanLang === 'typescript' || cleanLang === 'ts' ? 'ts'
      : cleanLang === 'javascript' || cleanLang === 'js' ? 'js'
      : cleanLang === 'python' || cleanLang === 'py' ? 'py'
      : cleanLang === 'html' ? 'html'
      : cleanLang === 'css' ? 'css'
      : cleanLang === 'json' ? 'json'
      : cleanLang === 'markdown' || cleanLang === 'md' ? 'md'
      : cleanLang === 'sql' ? 'sql'
      : 'txt';

    downloadFile(code, `code-snippet.${ext}`, 'text/plain');
  };

  const lines = code.trim().split('\n').length;

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-warm-200 dark:border-warm-800 bg-[#1e1e1e] text-warm-100 shadow-sm font-mono text-[13px]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3d3d3d] select-none text-xs text-warm-300">
        <div className="flex items-center space-x-2">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-claude-coral">
            {cleanLang}
          </span>
          <span className="text-warm-500">•</span>
          <span className="text-warm-400">{lines} {lines === 1 ? 'line' : 'lines'}</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleDownload}
            title="Download code"
            className="p-1.5 rounded-md hover:bg-[#3d3d3d] text-warm-300 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            title="Copy code"
            className="flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-[#3d3d3d] text-warm-300 hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] text-emerald-400 font-sans">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px] font-sans">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className="p-4 overflow-x-auto text-[13px] leading-relaxed">
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

