import { useState, useEffect, useCallback } from 'react';
import { Project } from '../types';
import { api } from '../lib/storage';

const ACTIVE_PROJECT_KEY = 'aether_active_project_id';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_PROJECT_KEY) || null;
    } catch (_) {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdState(id);
    try {
      if (id) {
        localStorage.setItem(ACTIVE_PROJECT_KEY, id);
      } else {
        localStorage.removeItem(ACTIVE_PROJECT_KEY);
      }
    } catch (_) {}
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getProjects();
      setProjects(data);
      // If the saved activeProjectId is no longer in data, clear it
      if (activeProjectId && !data.some((p) => p.id === activeProjectId)) {
        setActiveProjectId(null);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId, setActiveProjectId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const createProject = async (name: string, description?: string, custom_instructions?: string) => {
    const created = await api.createProject({ name, description, custom_instructions });
    setProjects((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
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
    if (activeProjectId === id) {
      setActiveProjectId(null);
    }
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
