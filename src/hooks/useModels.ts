import { useState, useEffect, useCallback, useMemo } from 'react';
import { VerifiedFreeModel, AUTO_FREE_MODEL, AUTO_MODEL_ID } from '../types';
import { api } from '../lib/storage';

export { AUTO_MODEL_ID, AUTO_FREE_MODEL };

export function useModels() {
  const [models, setModels] = useState<VerifiedFreeModel[]>([AUTO_FREE_MODEL]);
  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    return localStorage.getItem('aether_selected_model') || AUTO_MODEL_ID;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadModels = useCallback(async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      const data = await api.getModels(refresh);
      // Prioritize fast, verified, and responsive free models
      const preferred = [
        'nvidia/nemotron-3-ultra-550b-a55b:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'deepseek/deepseek-chat:free',
        'deepseek/deepseek-r1:free',
        'nvidia/nemotron-3.5-lightning:free',
        'dots-studio/dots-3-note-preview:free',
        'qwen/qwen-2.5-coder-32b-instruct:free',
        'mistralai/mistral-small-24b-instruct-2501:free',
        'google/gemini-2.0-flash-exp:free',
        'google/gemini-2.0-flash-thinking-exp:free',
      ];

      const sorted = [...data].sort((a, b) => {
        const aIndex = preferred.indexOf(a.id);
        const bIndex = preferred.indexOf(b.id);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

      // Always place AUTO_FREE_MODEL at the very top of the list
      const listWithAuto = [
        AUTO_FREE_MODEL,
        ...sorted.filter((m) => m.id !== AUTO_MODEL_ID),
      ];

      setModels(listWithAuto);

      // Verify that selected model is still in the free list or auto
      if (selectedModelId !== AUTO_MODEL_ID && selectedModelId !== 'auto') {
        const found = sorted.some((m) => m.id === selectedModelId);
        if (!found || selectedModelId.includes('flint')) {
          setSelectedModelId(AUTO_MODEL_ID);
          localStorage.setItem('aether_selected_model', AUTO_MODEL_ID);
        }
      }
    } catch (err: any) {
      console.error('Failed to load models:', err);
      setError(err.message || 'Failed to fetch free models');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedModelId]);

  useEffect(() => {
    loadModels(false);
  }, []);

  const handleSelectModel = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    localStorage.setItem('aether_selected_model', modelId);
  }, []);

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models;
    const q = searchQuery.toLowerCase();
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [models, searchQuery]);

  const modelsByProvider = useMemo(() => {
    const map = new Map<string, VerifiedFreeModel[]>();
    for (const m of filteredModels) {
      const p = m.provider || 'Other';
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(m);
    }
    return Array.from(map.entries()).map(([provider, items]) => ({
      provider,
      models: items,
    }));
  }, [filteredModels]);

  const selectedModel = useMemo(() => {
    if (selectedModelId === AUTO_MODEL_ID || selectedModelId === 'auto') {
      return AUTO_FREE_MODEL;
    }
    return models.find((m) => m.id === selectedModelId) || AUTO_FREE_MODEL;
  }, [models, selectedModelId]);

  return {
    models,
    filteredModels,
    modelsByProvider,
    selectedModel,
    selectedModelId,
    selectModel: handleSelectModel,
    refreshModels: () => loadModels(true),
    isLoading,
    isRefreshing,
    error,
    searchQuery,
    setSearchQuery,
  };
}
