import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Save, Trash2 } from 'lucide-react';
import { Project } from '../../types';

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-3xl max-w-lg w-full p-6 shadow-warm-lg">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-warm-150 dark:border-warm-800">
          <div className="flex items-center space-x-2">
            <FolderPlus className="w-5 h-5 text-claude-coral" />
            <h2 className="text-lg font-serif font-semibold text-warm-900 dark:text-warm-50">
              {project ? 'Edit Project' : 'Create New Project'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-warm-400 hover:text-warm-800 dark:hover:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider mb-1.5">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Next.js Migration, Novel Draft, Market Research"
              className="w-full px-3.5 py-2 rounded-xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 text-sm focus:outline-none focus:ring-2 focus:ring-claude-coral/40"
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
              placeholder="Brief summary of this workspace's purpose"
              className="w-full px-3.5 py-2 rounded-xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 text-sm focus:outline-none focus:ring-2 focus:ring-claude-coral/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider mb-1.5">
              Project Custom Instructions
            </label>
            <textarea
              rows={4}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Provide system instructions applied automatically to every conversation inside this project (e.g. 'Always write code in TypeScript with functional paradigms...')"
              className="w-full p-3 rounded-xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 text-sm focus:outline-none focus:ring-2 focus:ring-claude-coral/40 resize-none"
            />
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

