import { useState, useEffect, useCallback } from 'react';
import { Project } from '../types';
import { api } from '../lib/storage';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const createProject = async (name: string, description?: string, custom_instructions?: string) => {
    const created = await api.createProject({ name, description, custom_instructions });
    setProjects((prev) => [created, ...prev]);
    return created;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const updated = await api.updateProject(id, updates);
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const deleteProject = async (id: string) => {
    await api.deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProjectId === id) setActiveProjectId(null);
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  return {
    projects,
    activeProject,
    activeProjectId,
    setActiveProjectId,
    isLoading,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects: loadProjects,
  };
}

