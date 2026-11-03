import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Sparkles,
  Search,
  RotateCw,
  Eye,
  Info,
  Check,
  Zap,
} from 'lucide-react';
import { VerifiedFreeModel, AUTO_MODEL_ID } from '../../types';
import { formatContextLength } from '../../lib/utils';

interface ModelSelectorProps {
  models: VerifiedFreeModel[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  onRefreshModels: () => void;
  isRefreshing: boolean;
  onOpenModelInfo?: () => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  onRefreshModels,
  isRefreshing,
  onOpenModelInfo,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAuto = selectedModelId === AUTO_MODEL_ID || selectedModelId === 'auto';
  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter out auto from normal provider list so auto is featured cleanly at top
  const nonAutoModels = models.filter((m) => m.id !== AUTO_MODEL_ID && m.id !== 'auto');

  const filtered = nonAutoModels.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.provider.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    );
  });

  // Group by provider
  const groups = filtered.reduce((acc, m) => {
    const p = m.provider || 'Other';
    if (!acc[p]) acc[p] = [];
    acc[p].push(m);
    return acc;
  }, {} as Record<string, VerifiedFreeModel[]>);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-sm ${
          isAuto
            ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-900 dark:text-amber-100'
            : 'bg-warm-100 hover:bg-warm-150 dark:bg-warm-850 dark:hover:bg-warm-800 border-warm-200 dark:border-warm-800 text-warm-900 dark:text-warm-100'
        }`}
      >
        {isAuto ? (
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-claude-coral shrink-0" />
        )}
        <span className="font-semibold max-w-[155px] truncate">
          {isAuto ? 'Auto (Smart Free Router)' : selectedModel?.name || 'Select Free Model'}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
            isAuto
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {isAuto ? 'auto' : 'free'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-warm-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 shadow-warm-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header with Search & Refresh */}
          <div className="p-3 border-b border-warm-150 dark:border-warm-800 bg-warm-50 dark:bg-warm-850/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-warm-700 dark:text-warm-300">
                Verified Free Models ({models.length})
              </span>
              <div className="flex items-center space-x-1">
                {onOpenModelInfo && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onOpenModelInfo();
                    }}
                    title="Model details & Free verification"
                    className="p-1 rounded-md text-warm-500 hover:text-warm-800 dark:hover:text-warm-200 hover:bg-warm-200/50 dark:hover:bg-warm-800"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={onRefreshModels}
                  disabled={isRefreshing}
                  title="Discover latest free models from OpenRouter"
                  className="flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-medium text-claude-coral hover:bg-warm-200/50 dark:hover:bg-warm-800 disabled:opacity-50"
                >
                  <RotateCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-warm-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models, providers..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 focus:outline-none focus:ring-1 focus:ring-claude-coral"
              />
            </div>
          </div>

          {/* Featured Auto-Select Option */}
          <div className="p-2 border-b border-warm-150 dark:border-warm-800 bg-amber-500/5">
            <button
              onClick={() => {
                onSelectModel(AUTO_MODEL_ID);
                setIsOpen(false);
              }}
              className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between border ${
                isAuto
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-950 dark:text-amber-50 shadow-xs'
                  : 'bg-white dark:bg-warm-850 border-warm-200/80 dark:border-warm-750 hover:border-amber-400/80 hover:bg-amber-50/50 dark:hover:bg-warm-800'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center space-x-1.5">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                  <span className="text-xs font-bold text-warm-900 dark:text-warm-50">
                    Auto (Smart Free Router)
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold uppercase">
                    Auto-Failover
                  </span>
                </div>
                <p className="text-[11px] text-warm-500 dark:text-warm-400 mt-1 leading-snug">
                  Automatically routes to the best available free model. Instant seamless switch if any rate limit is reached.
                </p>
              </div>
              {isAuto && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />}
            </button>
          </div>

          {/* List of Models Grouped by Provider */}
          <div className="max-h-64 overflow-y-auto p-2 space-y-3">
            {Object.keys(groups).length === 0 ? (
              <div className="p-4 text-center text-xs text-warm-400">
                No free models match your search.
              </div>
            ) : (
              Object.entries(groups).map(([provider, providerModels]) => (
                <div key={provider}>
                  <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-warm-400 uppercase">
                    {provider}
                  </div>
                  <div className="space-y-1">
                    {providerModels.map((m) => {
                      const isSelected = m.id === selectedModelId;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            onSelectModel(m.id);
                            setIsOpen(false);
                          }}
                          className={`w-full text-left p-2 rounded-xl transition-all flex items-start justify-between ${
                            isSelected
                              ? 'bg-claude-coral/10 dark:bg-claude-coral/20 border border-claude-coral/30'
                              : 'hover:bg-warm-100 dark:hover:bg-warm-850'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-semibold text-warm-900 dark:text-warm-100 truncate">
                                {m.name}
                              </span>
                              {m.supports_vision && (
                                <span title="Supports vision / image attachments">
                                  <Eye className="w-3 h-3 text-amber-500" />
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-warm-500 dark:text-warm-400 line-clamp-1 mt-0.5">
                              {m.description}
                            </p>
                          </div>

                          <div className="flex items-center space-x-1.5 flex-shrink-0 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-warm-200/60 dark:bg-warm-800 text-warm-600 dark:text-warm-300 font-mono">
                              {formatContextLength(m.context_length)}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-claude-coral" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="p-2 border-t border-warm-150 dark:border-warm-800 bg-warm-50 dark:bg-warm-850/50 text-[10px] text-warm-500 text-center">
            ⚡ Automatic Rate-Limit Failover Active: Never get blocked by model limits
          </div>
        </div>
      )}
    </div>
  );
};
