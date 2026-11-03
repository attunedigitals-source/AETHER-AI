import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Save, Trash2, Sparkles, BookTemplate } from 'lucide-react';
import { Project } from '../../types';
import { PROJECT_TEMPLATES, ProjectTemplate } from '../../lib/projectTemplates';

interface ProjectModalProps {
  project?: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string, custom_instructions?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  project,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setCustomInstructions(project.custom_instructions || '');
    } else {
      setName('');
      setDescription('');
      setCustomInstructions('');
    }
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleApplyTemplate = (tpl: ProjectTemplate) => {
    setName(tpl.name);
    setDescription(tpl.description);
    setCustomInstructions(tpl.custom_instructions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSaving(true);
      await onSave(name.trim(), description.trim(), customInstructions.trim());
      onClose();
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-3xl max-w-2xl w-full p-6 shadow-warm-lg flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-warm-150 dark:border-warm-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-claude-coral/10 text-claude-coral">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-semibold text-warm-900 dark:text-warm-50">
                {project ? 'Edit Project Workspace' : 'Create Custom Task / Project'}
              </h2>
              <p className="text-xs text-warm-500 dark:text-warm-400">
                Define specialized AI roles, workflows, and custom system instructions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-warm-400 hover:text-warm-800 dark:hover:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Selector Bar */}
        {!project && (
          <div className="pt-3 pb-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider mb-2">
              <BookTemplate className="w-3.5 h-3.5 text-claude-coral" />
              <span>Quick Workflow Templates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PROJECT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center space-x-1.5 ${
                    name === tpl.name
                      ? 'bg-claude-coral/10 border-claude-coral text-claude-coral font-medium shadow-xs'
                      : 'bg-warm-50 dark:bg-warm-850 border-warm-200 dark:border-warm-700 text-warm-700 dark:text-warm-300 hover:border-warm-400'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>{tpl.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider mb-1.5">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. InsightForge Studio"
                className="w-full px-3.5 py-2 rounded-xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 text-sm focus:outline-none focus:ring-2 focus:ring-claude-coral/40 text-warm-900 dark:text-warm-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Educational YouTube explainers workflow"
                className="w-full px-3.5 py-2 rounded-xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 text-sm focus:outline-none focus:ring-2 focus:ring-claude-coral/40 text-warm-900 dark:text-warm-100"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider">
                Custom Instructions & Task Guidelines
              </label>
              <span className="text-[11px] text-warm-400 font-mono">
                {customInstructions.length} chars / ~{customInstructions.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              rows={11}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Paste your complete task guidelines, system prompt, or workflow rules here (e.g. Claude Project instructions, operating principles, startup menus, step-by-step stages)..."
              className="w-full p-3.5 rounded-xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-claude-coral/40 resize-y min-h-[220px] text-warm-800 dark:text-warm-200"
            />
            <p className="text-[11px] text-warm-500 mt-1">
              Every message sent inside this project automatically inherits these instructions.
            </p>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-3 border-t border-warm-150 dark:border-warm-800">
            {project && onDelete ? (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this project?')) {
                    await onDelete(project.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-500/10 flex items-center space-x-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-warm-600 dark:text-warm-400 hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-claude-coral hover:bg-claude-coral-hover text-white flex items-center space-x-1.5 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Project'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
