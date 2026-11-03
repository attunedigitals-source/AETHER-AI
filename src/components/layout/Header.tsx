import React, { useState } from 'react';
import {
  Menu,
  Moon,
  Sun,
  Share2,
  Folder,
  Columns,
  Sparkles,
  Edit2,
  Check,
} from 'lucide-react';
import { Conversation, Project, VerifiedFreeModel } from '../../types';
import { ModelSelector } from '../models/ModelSelector';
import { Theme } from '../../hooks/useTheme';

interface HeaderProps {
  conversation: Conversation | null;
  models: VerifiedFreeModel[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  onRefreshModels: () => void;
  isRefreshing: boolean;
  onOpenModelInfo: () => void;
  onOpenModelCompare: () => void;
  onOpenShare: () => void;
  onRenameConversation: (id: string, newTitle: string) => Promise<void>;
  activeProject: Project | null;
  onEditProject?: (project: Project) => void;
  onToggleSidebarMobile: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  conversation,
  models,
  selectedModelId,
  onSelectModel,
  onRefreshModels,
  isRefreshing,
  onOpenModelInfo,
  onOpenModelCompare,
  onOpenShare,
  onRenameConversation,
  activeProject,
  onEditProject,
  onToggleSidebarMobile,
  theme,
  onToggleTheme,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  const handleStartEdit = () => {
    if (conversation) {
      setEditTitle(conversation.title);
      setIsEditingTitle(true);
    }
  };

  const handleSaveTitle = async () => {
    if (conversation && editTitle.trim()) {
      await onRenameConversation(conversation.id, editTitle.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="h-14 border-b border-warm-200 dark:border-warm-850 bg-[#FAF9F5]/80 dark:bg-[#1C1B18]/80 backdrop-blur-md px-4 flex items-center justify-between z-20 select-none">
      {/* Left: Mobile Menu & Conversation Title */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={onToggleSidebarMobile}
          className="md:hidden p-2 rounded-xl text-warm-600 dark:text-warm-300 hover:bg-warm-200 dark:hover:bg-warm-800"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Project Tag if conversation belongs to project */}
        {activeProject && (
          <button
            onClick={() => onEditProject?.(activeProject)}
            title="Edit project instructions and configuration"
            className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium border border-amber-500/20 transition-colors group cursor-pointer"
          >
            <Folder className="w-3 h-3 text-amber-500" />
            <span className="truncate max-w-[120px]">{activeProject.name}</span>
            <Edit2 className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        {/* Title */}
        {conversation ? (
          isEditingTitle ? (
            <div className="flex items-center space-x-1">
              <input
                type="text"
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="text-xs px-2 py-1 rounded-lg bg-white dark:bg-warm-800 border border-claude-coral focus:outline-none"
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 text-emerald-500 hover:bg-warm-200 dark:hover:bg-warm-800 rounded"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 group cursor-pointer" onClick={handleStartEdit}>
              <span className="font-semibold text-xs md:text-sm text-warm-900 dark:text-warm-100 truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                {conversation.title}
              </span>
              <Edit2 className="w-3 h-3 text-warm-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )
        ) : (
          <div className="flex items-center space-x-1.5 text-xs text-warm-500 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-claude-coral" />
            <span>New Chat</span>
          </div>
        )}
      </div>

      {/* Right Tools: Model Selector, Compare, Share, Theme */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* Model Selector */}
        <ModelSelector
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={onSelectModel}
          onRefreshModels={onRefreshModels}
          isRefreshing={isRefreshing}
          onOpenModelInfo={onOpenModelInfo}
        />

        {/* Compare Models Arena */}
        <button
          onClick={onOpenModelCompare}
          title="Compare two free models side-by-side"
          className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-warm-100 hover:bg-warm-150 dark:bg-warm-850 dark:hover:bg-warm-800 border border-warm-200 dark:border-warm-800 text-xs font-medium text-warm-700 dark:text-warm-300 transition-colors shadow-sm"
        >
          <Columns className="w-3.5 h-3.5 text-claude-coral" />
          <span className="hidden md:inline">Compare</span>
        </button>

        {/* Share Button (Active if conversation exists) */}
        {conversation && (
          <button
            onClick={onOpenShare}
            title="Share or Export chat"
            className="p-2 rounded-xl text-warm-500 hover:text-warm-800 dark:hover:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title="Toggle light / dark theme"
          className="p-2 rounded-xl text-warm-500 hover:text-warm-800 dark:hover:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
