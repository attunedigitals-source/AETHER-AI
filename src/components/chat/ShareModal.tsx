import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText, Share2, Link as LinkIcon } from 'lucide-react';
import { Conversation, Message } from '../../types';
import { downloadFile } from '../../lib/utils';

interface ShareModalProps {
  conversation: Conversation | null;
  messages: Message[];
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  conversation,
  messages,
  isOpen,
  onClose,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  if (!isOpen || !conversation) return null;

  const generateMarkdown = () => {
    let md = `# ${conversation.title}\n\n`;
    md += `*Model: ${conversation.model_id} | Exported: ${new Date().toLocaleString()}*\n\n---\n\n`;

    for (const msg of messages) {
      const roleName = msg.role === 'user' ? 'User' : 'Assistant';
      md += `### ${roleName}\n\n${msg.content}\n\n`;
    }
    return md;
  };

  const handleCopyLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/#conv-${conversation.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (_) {}
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(generateMarkdown());
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch (_) {}
  };

  const handleDownloadMarkdown = () => {
    const filename = `${conversation.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    downloadFile(generateMarkdown(), filename, 'text/markdown');
  };

  const handleDownloadJSON = () => {
    const filename = `${conversation.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    const data = JSON.stringify({ conversation, messages }, null, 2);
    downloadFile(data, filename, 'application/json');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-3xl max-w-md w-full p-6 shadow-warm-lg">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-warm-150 dark:border-warm-800">
          <div className="flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-claude-coral" />
            <h2 className="text-lg font-serif font-semibold text-warm-900 dark:text-warm-50">
              Share & Export Chat
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-warm-400 hover:text-warm-800 dark:hover:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="py-4 space-y-3">
          {/* Share Link */}
          <div className="p-3.5 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <LinkIcon className="w-4 h-4 text-warm-500" />
              <div className="text-left">
                <div className="text-xs font-semibold text-warm-900 dark:text-warm-100">
                  Shareable Link
                </div>
                <div className="text-[11px] text-warm-500">Copy browser link</div>
              </div>
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-warm-200 hover:bg-warm-300 dark:bg-warm-800 dark:hover:bg-warm-700 text-xs font-medium text-warm-900 dark:text-warm-100 flex items-center space-x-1.5 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Copy Markdown */}
          <div className="p-3.5 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <FileText className="w-4 h-4 text-claude-coral" />
              <div className="text-left">
                <div className="text-xs font-semibold text-warm-900 dark:text-warm-100">
                  Copy Markdown
                </div>
                <div className="text-[11px] text-warm-500">Copy formatted text to clipboard</div>
              </div>
            </div>
            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-1.5 rounded-xl bg-warm-200 hover:bg-warm-300 dark:bg-warm-800 dark:hover:bg-warm-700 text-xs font-medium text-warm-900 dark:text-warm-100 flex items-center space-x-1.5 transition-colors"
            >
              {copiedMarkdown ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMarkdown ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Download Markdown */}
          <div className="p-3.5 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Download className="w-4 h-4 text-emerald-500" />
              <div className="text-left">
                <div className="text-xs font-semibold text-warm-900 dark:text-warm-100">
                  Export as Markdown (.md)
                </div>
                <div className="text-[11px] text-warm-500">Download conversation document</div>
              </div>
            </div>
            <button
              onClick={handleDownloadMarkdown}
              className="px-3 py-1.5 rounded-xl bg-warm-200 hover:bg-warm-300 dark:bg-warm-800 dark:hover:bg-warm-700 text-xs font-medium text-warm-900 dark:text-warm-100 transition-colors"
            >
              Download
            </button>
          </div>

          {/* Download JSON */}
          <div className="p-3.5 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Download className="w-4 h-4 text-blue-500" />
              <div className="text-left">
                <div className="text-xs font-semibold text-warm-900 dark:text-warm-100">
                  Export as JSON (.json)
                </div>
                <div className="text-[11px] text-warm-500">Structured data with messages</div>
              </div>
            </div>
            <button
              onClick={handleDownloadJSON}
              className="px-3 py-1.5 rounded-xl bg-warm-200 hover:bg-warm-300 dark:bg-warm-800 dark:hover:bg-warm-700 text-xs font-medium text-warm-900 dark:text-warm-100 transition-colors"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

