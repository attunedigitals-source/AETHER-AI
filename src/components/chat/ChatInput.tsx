import React, { useState, useRef, useEffect, DragEvent } from 'react';
import {
  ArrowUp,
  Square,
  Paperclip,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { Attachment, VerifiedFreeModel, TaskFrameworkState } from '../../types';
import { FilePreviewList } from './FilePreviewList';
import { api } from '../../lib/storage';

interface ChatInputProps {
  onSendMessage: (content: string, attachments: Attachment[]) => void;
  onStopGeneration: () => void;
  isStreaming: boolean;
  selectedModel: VerifiedFreeModel | null;
  initialPrompt?: string;
  taskState?: TaskFrameworkState;
  onResumeTask?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopGeneration,
  isStreaming,
  selectedModel,
  initialPrompt,
  taskState,
  onResumeTask,
}) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If parent populated an initial prompt (e.g. from welcome card)
  useEffect(() => {
    if (initialPrompt) {
      setContent(initialPrompt);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [initialPrompt]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
  }, [content]);

  const handleSend = () => {
    if (isStreaming) {
      onStopGeneration();
      return;
    }

    if (!content.trim() && attachments.length === 0) return;

    onSendMessage(content, attachments);
    setContent('');
    setAttachments([]);
    setUploadError(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const attachment = await api.uploadFile(file);
      setAttachments((prev) => [...prev, attachment]);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      processFile(files[i]);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (const file of files) {
        processFile(file);
      }
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Check if user has attached an image to a non-vision model
  const hasImages = attachments.some((a) => a.isImage);
  const showVisionWarning = hasImages && selectedModel && !selectedModel.supports_vision;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative max-w-3xl mx-auto w-full px-4 md:px-0 mb-4"
    >
      {/* Drag & drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-claude-coral/10 dark:bg-claude-coral/20 border-2 border-dashed border-claude-coral rounded-3xl z-30 flex items-center justify-center backdrop-blur-sm pointer-events-none">
          <p className="text-sm font-medium text-claude-coral">
            Drop your documents or images here...
          </p>
        </div>
      )}

      {/* Network Interruption Quick-Resume Pill */}
      {taskState?.isInterrupted && onResumeTask && !isStreaming && (
        <div className="mb-2 p-2.5 px-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>
              Previous task output was cut off by network.
            </span>
          </div>
          <button
            onClick={onResumeTask}
            className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-claude-coral hover:bg-claude-coral-hover text-white font-medium transition-all shadow-xs active:scale-95"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>Resume Task</span>
          </button>
        </div>
      )}

      {/* Vision Warning Pill */}
      {showVisionWarning && (
        <div className="mb-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
          <span>
            <strong>{selectedModel?.name}</strong> does not support image analysis. For visual tasks, switch to a vision-capable free model like <em>Gemini 2.0 Flash Exp:free</em>.
          </span>
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="mb-2 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="font-semibold px-1">✕</button>
        </div>
      )}

      {/* Main Composer Box */}
      <div className="rounded-3xl bg-white dark:bg-warm-850 border border-warm-200 dark:border-warm-800 shadow-warm-md hover:border-warm-300 dark:hover:border-warm-700 transition-all focus-within:ring-2 focus-within:ring-claude-coral/40 p-3">
        {/* Attachment tray */}
        {attachments.length > 0 && (
          <FilePreviewList attachments={attachments} onRemove={handleRemoveAttachment} />
        )}

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${selectedModel?.name || 'Aether'}...`}
          rows={1}
          className="w-full bg-transparent resize-none border-0 focus:outline-none focus:ring-0 text-[15px] placeholder-warm-400 dark:placeholder-warm-500 text-warm-900 dark:text-warm-50 py-1.5 px-2 max-h-60"
        />

        {/* Controls footer */}
        <div className="flex items-center justify-between pt-2 border-t border-warm-150 dark:border-warm-800/60 mt-1">
          {/* Left tools: Attachment, Upload status */}
          <div className="flex items-center space-x-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              multiple
              accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,.json,.md,.js,.ts,.py,.html,.css,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Attach documents, spreadsheets, code, or images"
              className="p-2 rounded-xl text-warm-500 hover:text-warm-800 dark:hover:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-claude-coral" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>
            <span className="text-[11px] text-warm-400 font-sans hidden sm:inline-block">
              PDF, DOCX, XLSX, Code, Images
            </span>
          </div>

          {/* Right actions: Send / Stop button */}
          <div className="flex items-center space-x-2">
            {isStreaming ? (
              <button
                onClick={onStopGeneration}
                title="Stop generation"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-warm-800 dark:bg-warm-200 text-white dark:text-warm-900 hover:scale-105 transition-transform"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!content.trim() && attachments.length === 0}
                title="Send message (Enter)"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-claude-coral hover:bg-claude-coral-hover disabled:bg-warm-200 dark:disabled:bg-warm-800 text-white disabled:text-warm-400 dark:disabled:text-warm-600 transition-all hover:scale-105 disabled:hover:scale-100"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-center mt-2">
        <p className="text-[11px] text-warm-400 dark:text-warm-500">
          Aether exclusively uses verified OpenRouter free-tier models. Pricing is always $0/token.
        </p>
      </div>
    </div>
  );
};
