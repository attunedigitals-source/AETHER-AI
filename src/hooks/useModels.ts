import { useState, useEffect, useCallback, useMemo } from 'react';
import { VerifiedFreeModel } from '../types';
import { api } from '../lib/storage';

export function useModels() {
  const [models, setModels] = useState<VerifiedFreeModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    return localStorage.getItem('aether_selected_model') || 'meta-llama/llama-3.3-70b-instruct:free';
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
      setModels(data);

      // Verify that selected model is still in the free list
      if (data.length > 0) {
        const found = data.some((m) => m.id === selectedModelId);
        if (!found) {
          const fallback = data[0].id;
          setSelectedModelId(fallback);
          localStorage.setItem('aether_selected_model', fallback);
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
    return models.find((m) => m.id === selectedModelId) || null;
  }, [models, selectedModelId]);

  return {
    models,
    filteredModels,
    modelsByProvider,
    selectedModel,
    selectedModelId,
    selectModel: handleSelectModel,
    isLoading,
    isRefreshing,
    error,
    searchQuery,
    setSearchQuery,
    refreshModels: () => loadModels(true),
  };
}

