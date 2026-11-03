import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCw,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bot,
  Play,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { Message, VerifiedFreeModel } from '../../types';
import { MessageContent } from './MessageContent';
import { FilePreviewList } from './FilePreviewList';
import { downloadFile } from '../../lib/utils';

interface MessageItemProps {
  message: Message;
  freeModels: VerifiedFreeModel[];
  onRegenerate: (messageId: string, alternateModelId?: string) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onFeedback: (messageId: string, feedback: 'like' | 'dislike' | null) => void;
  onResumeTask?: (messageId: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  freeModels,
  onRegenerate,
  onEdit,
  onFeedback,
  onResumeTask,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const isUser = message.role === 'user';
  const wordCount = message.content ? message.content.trim().split(/\s+/).filter(Boolean).length : 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownloadMessage = () => {
    const scriptMatch = message.content.match(/(?:script|image_prompts|file)_[a-zA-Z0-9_]+\.(?:txt|md)/i);
    const filename = scriptMatch ? scriptMatch[0] : `response-${message.id.slice(-6)}.txt`;
    downloadFile(message.content, filename, 'text/plain');
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  return (
    <div
      className={`group w-full py-5 px-4 md:px-6 transition-colors ${
        isUser
          ? 'bg-transparent'
          : message.is_interrupted
          ? 'bg-amber-500/5 dark:bg-amber-950/20 border-y border-amber-500/30'
          : 'bg-warm-100/60 dark:bg-warm-900/40 border-y border-warm-200/50 dark:border-warm-850/50'
      }`}
    >
      <div className="max-w-3xl mx-auto flex items-start space-x-4">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-warm-200 dark:bg-warm-800 text-warm-700 dark:text-warm-200 flex items-center justify-center font-semibold text-xs shadow-sm">
              You
            </div>
          ) : (
            <div className={`w-8 h-8 rounded-full ${message.is_interrupted ? 'bg-amber-500' : 'bg-gradient-to-tr from-claude-coral to-amber-500'} text-white flex items-center justify-center shadow-sm`}>
              {message.is_interrupted ? <AlertTriangle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
          )}
        </div>

        {/* Message body */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-xs text-warm-800 dark:text-warm-200">
                {isUser ? 'You' : 'Aether'}
              </span>
              {!isUser && message.model_id && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-warm-200/60 dark:bg-warm-800 text-warm-600 dark:text-warm-400 font-mono">
                  {message.model_id.replace(':free', '')}
                </span>
              )}
              {message.is_interrupted && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Interrupted by Network
                </span>
              )}
            </div>

            {/* Version Switcher if multiple versions exist */}
            {message.versions && message.versions.length > 1 && (
              <div className="flex items-center space-x-1 text-xs text-warm-500">
                <span>
                  {(message.activeVersionIndex || 0) + 1} / {message.versions.length}
                </span>
              </div>
            )}
          </div>

          {/* Attachments if any */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2">
              <FilePreviewList attachments={message.attachments} readOnly />
            </div>
          )}

          {/* Content or Edit mode */}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-3 rounded-xl bg-white dark:bg-warm-850 border border-warm-300 dark:border-warm-700 text-sm focus:outline-none focus:ring-2 focus:ring-claude-coral/50"
                rows={4}
              />
              <div className="flex items-center space-x-2 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-warm-600 dark:text-warm-400 hover:bg-warm-200 dark:hover:bg-warm-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-claude-coral hover:bg-claude-coral-hover text-white transition-colors"
                >
                  Save & Resend
                </button>
              </div>
            </div>
          ) : (
            <MessageContent content={message.content} />
          )}

          {/* Interruption Recovery Banner */}
          {!isUser && message.is_interrupted && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div>
                  <span className="font-semibold">Network interrupted response.</span>{' '}
                  <span className="text-warm-600 dark:text-warm-400">
                    {wordCount} words preserved. You can resume without restarting.
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {onResumeTask && (
                  <button
                    onClick={() => onResumeTask(message.id)}
                    className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-claude-coral hover:bg-claude-coral-hover text-white font-medium shadow-sm transition-all active:scale-95"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Resume Task</span>
                  </button>
                )}
                <button
                  onClick={() => onRegenerate(message.id)}
                  className="px-2.5 py-1 rounded-lg hover:bg-amber-500/20 text-warm-700 dark:text-warm-300 transition-colors"
                >
                  Restart Step
                </button>
              </div>
            </div>
          )}

          {/* Action buttons footer */}
          {!isEditing && (
            <div className="flex items-center space-x-1 mt-3 text-warm-400 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Copy */}
              <button
                onClick={handleCopy}
                title="Copy message"
                className="p-1.5 rounded-md hover:bg-warm-200/60 dark:hover:bg-warm-800 hover:text-warm-700 dark:hover:text-warm-200 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* User Edit */}
              {isUser && (
                <button
                  onClick={() => setIsEditing(true)}
                  title="Edit message"
                  className="p-1.5 rounded-md hover:bg-warm-200/60 dark:hover:bg-warm-800 hover:text-warm-700 dark:hover:text-warm-200 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Assistant Actions */}
              {!isUser && (
                <>
                  {/* Download response */}
                  <button
                    onClick={handleDownloadMessage}
                    title="Download message as file (.txt)"
                    className="p-1.5 rounded-md hover:bg-warm-200/60 dark:hover:bg-warm-800 hover:text-warm-700 dark:hover:text-warm-200 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Quick Resume Button if interrupted */}
                  {message.is_interrupted && onResumeTask && (
                    <button
                      onClick={() => onResumeTask(message.id)}
                      title="Resume interrupted generation"
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium bg-claude-coral hover:bg-claude-coral-hover text-white transition-colors"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Resume</span>
                    </button>
                  )}

                  {/* Regenerate with same model */}
                  <button
                    onClick={() => onRegenerate(message.id)}
                    title="Regenerate response"
                    className="p-1.5 rounded-md hover:bg-warm-200/60 dark:hover:bg-warm-800 hover:text-warm-700 dark:hover:text-warm-200 transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  {/* Regenerate with alternate free model */}
                  <div className="relative">
                    <button
                      onClick={() => setShowModelPicker(!showModelPicker)}
                      title="Regenerate with different free model"
                      className="flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] hover:bg-warm-200/60 dark:hover:bg-warm-800 hover:text-warm-700 dark:hover:text-warm-200 transition-colors font-sans"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Switch Model</span>
                    </button>

                    {showModelPicker && (
                      <div className="absolute left-0 bottom-full mb-1 w-64 p-2 bg-white dark:bg-warm-900 rounded-xl shadow-warm-lg border border-warm-200 dark:border-warm-800 z-30">
                        <div className="text-[11px] font-semibold text-warm-500 uppercase px-2 py-1 mb-1">
                          Free Model Fallback
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {freeModels
                            .filter((m) => m.id !== message.model_id)
                            .map((m) => (
                              <button
                                key={m.id}
                                onClick={() => {
                                  setShowModelPicker(false);
                                  onRegenerate(message.id, m.id);
                                }}
                                className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors"
                              >
                                <div className="font-medium text-warm-900 dark:text-warm-100 truncate">
                                  {m.name}
                                </div>
                                <div className="text-[10px] text-warm-400 truncate">{m.provider}</div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thumbs Up */}
                  <button
                    onClick={() => onFeedback(message.id, message.feedback === 'like' ? null : 'like')}
                    title="Helpful response"
                    className={`p-1.5 rounded-md hover:bg-warm-200/60 dark:hover:bg-warm-800 transition-colors ${
                      message.feedback === 'like' ? 'text-emerald-500 font-bold' : ''
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Thumbs Down */}
                  <button
                    onClick={() => onFeedback(message.id, message.feedback === 'dislike' ? null : 'dislike')}
                    title="Not helpful"
                    className={`p-1.5 rounded-md hover:bg-warm-200/60 dark:hover:bg-warm-800 transition-colors ${
                      message.feedback === 'dislike' ? 'text-red-500 font-bold' : ''
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
