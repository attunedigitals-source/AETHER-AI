import React, { useState } from 'react';
import { X, Sparkles, Send, Loader2, Bot } from 'lucide-react';
import { VerifiedFreeModel } from '../../types';
import { MessageContent } from './MessageContent';
import { getHeaders } from '../../lib/storage';

interface ModelCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  freeModels: VerifiedFreeModel[];
}

export const ModelCompareModal: React.FC<ModelCompareModalProps> = ({
  isOpen,
  onClose,
  freeModels,
}) => {
  const [modelA, setModelA] = useState<string>(
    freeModels[0]?.id || 'meta-llama/llama-3.3-70b-instruct:free'
  );
  const [modelB, setModelB] = useState<string>(
    freeModels[1]?.id || 'deepseek/deepseek-chat:free'
  );
  const [prompt, setPrompt] = useState('');
  const [responseA, setResponseA] = useState('');
  const [responseB, setResponseB] = useState('');
  const [isLoadingA, setIsLoadingA] = useState(false);
  const [isLoadingB, setIsLoadingB] = useState(false);

  if (!isOpen) return null;

  const streamFromModel = async (
    modelId: string,
    setResponse: (updater: (prev: string) => string) => void,
    setLoading: (l: boolean) => void
  ) => {
    try {
      setLoading(true);
      setResponse(() => '');

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          modelId,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.content) {
              setResponse((prev) => prev + parsed.content);
            }
          } catch (_) {}
        }
      }
    } catch (err: any) {
      setResponse((prev) => prev + `\n\n[Error: ${err.message}]`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = () => {
    if (!prompt.trim()) return;
    streamFromModel(modelA, setResponseA, setIsLoadingA);
    streamFromModel(modelB, setResponseB, setIsLoadingB);
  };

  const infoA = freeModels.find((m) => m.id === modelA);
  const infoB = freeModels.find((m) => m.id === modelB);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-3xl max-w-5xl w-full h-[85vh] flex flex-col shadow-warm-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-150 dark:border-warm-800 bg-warm-50 dark:bg-warm-850">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-claude-coral" />
            <h2 className="text-lg font-serif font-semibold text-warm-900 dark:text-warm-50">
              Free Model Comparison Arena
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
              100% Free
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-warm-400 hover:text-warm-800 dark:hover:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prompt Input Bar */}
        <div className="p-4 border-b border-warm-150 dark:border-warm-800 bg-white dark:bg-warm-900 flex space-x-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
            placeholder="Type a prompt to test both free models simultaneously..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 text-sm focus:outline-none focus:ring-2 focus:ring-claude-coral/40"
          />
          <button
            onClick={handleCompare}
            disabled={!prompt.trim() || isLoadingA || isLoadingB}
            className="px-5 py-2.5 rounded-2xl bg-claude-coral hover:bg-claude-coral-hover disabled:bg-warm-200 dark:disabled:bg-warm-800 text-white font-medium text-xs flex items-center space-x-2 transition-all"
          >
            {isLoadingA || isLoadingB ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Compare</span>
          </button>
        </div>

        {/* Side-by-side Response Columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-warm-150 dark:divide-warm-800 overflow-hidden">
          {/* Column A */}
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-3 border-b border-warm-150 dark:border-warm-800 bg-warm-50/50 dark:bg-warm-850/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-warm-500 uppercase">Model A</span>
              <select
                value={modelA}
                onChange={(e) => setModelA(e.target.value)}
                className="text-xs font-medium rounded-lg bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 px-2.5 py-1 text-warm-800 dark:text-warm-200 focus:outline-none"
              >
                {freeModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingA && !responseA && (
                <div className="flex items-center space-x-2 text-xs text-warm-400 py-4">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-claude-coral" />
                  <span>Generating with {infoA?.name}...</span>
                </div>
              )}
              {responseA ? (
                <MessageContent content={responseA} />
              ) : (
                !isLoadingA && (
                  <div className="h-full flex items-center justify-center text-xs text-warm-400">
                    Awaiting prompt comparison...
                  </div>
                )
              )}
            </div>
          </div>

          {/* Column B */}
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-3 border-b border-warm-150 dark:border-warm-800 bg-warm-50/50 dark:bg-warm-850/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-warm-500 uppercase">Model B</span>
              <select
                value={modelB}
                onChange={(e) => setModelB(e.target.value)}
                className="text-xs font-medium rounded-lg bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 px-2.5 py-1 text-warm-800 dark:text-warm-200 focus:outline-none"
              >
                {freeModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingB && !responseB && (
                <div className="flex items-center space-x-2 text-xs text-warm-400 py-4">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-claude-coral" />
                  <span>Generating with {infoB?.name}...</span>
                </div>
              )}
              {responseB ? (
                <MessageContent content={responseB} />
              ) : (
                !isLoadingB && (
                  <div className="h-full flex items-center justify-center text-xs text-warm-400">
                    Awaiting prompt comparison...
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

