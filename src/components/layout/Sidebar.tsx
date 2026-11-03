import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  Folder,
  FolderPlus,
  Star,
  Archive,
  Trash2,
  Edit3,
  Settings,
  User,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  MessageSquare,
  Check,
  X,
} from 'lucide-react';
import { Conversation, Project } from '../../types';
import { formatDateRelative } from '../../lib/utils';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onStartNewChat: () => void;
  onRenameConversation: (id: string, title: string) => Promise<void>;
  onToggleStar: (id: string) => Promise<void>;
  onToggleArchive: (id: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onOpenNewProject: () => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (projectId: string) => Promise<void> | void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onStartNewChat,
  onRenameConversation,
  onToggleStar,
  onToggleArchive,
  onDeleteConversation,
  projects,
  activeProjectId,
  onSelectProject,
  onOpenNewProject,
  onEditProject,
  onDeleteProject,
  onOpenSettings,
  onOpenAuth,
  searchQuery,
  onSearchChange,
  isOpen,
  onCloseMobile,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showProjects, setShowProjects] = useState(true);

  const startRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setActiveMenuId(null);
  };

  const handleSaveRename = async (id: string) => {
    if (editTitle.trim()) {
      await onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  // Filter conversations
  const nonArchived = conversations.filter((c) => !c.is_archived);
  const archived = conversations.filter((c) => c.is_archived);
  const starred = nonArchived.filter((c) => c.is_starred);

  // Group non-starred, non-archived by date
  const regular = nonArchived.filter((c) => !c.is_starred);
  const grouped = regular.reduce((acc, conv) => {
    const label = formatDateRelative(conv.updated_at);
    if (!acc[label]) acc[label] = [];
    acc[label].push(conv);
    return acc;
  }, {} as Record<string, Conversation[]>);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-[#F5F4EE] dark:bg-[#191918] border-r border-warm-200 dark:border-warm-850 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-warm-200/60 dark:border-warm-850">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-claude-coral to-amber-500 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-base text-warm-900 dark:text-warm-50 tracking-tight">
                Aether AI
              </h1>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                Free Models Only
              </span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-warm-500 hover:bg-warm-200 dark:hover:bg-warm-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onStartNewChat();
              onCloseMobile();
            }}
            className="w-full py-2.5 px-3.5 rounded-2xl bg-white dark:bg-warm-850 hover:bg-warm-50 dark:hover:bg-warm-800 border border-warm-200 dark:border-warm-700 text-warm-900 dark:text-warm-100 font-medium text-xs shadow-sm flex items-center justify-between transition-all group"
          >
            <div className="flex items-center space-x-2">
              <Plus className="w-4 h-4 text-claude-coral group-hover:scale-110 transition-transform" />
              <span>Start new chat</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-warm-100 dark:bg-warm-800 text-warm-400 font-mono">
              Ctrl+K
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-warm-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-warm-200/40 dark:bg-warm-850 border border-transparent focus:border-warm-300 dark:focus:border-warm-700 text-warm-900 dark:text-warm-100 focus:outline-none placeholder-warm-400"
            />
          </div>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 text-xs select-none">
          {/* Projects Section */}
          <div>
            <div className="flex items-center justify-between px-2 py-1 text-warm-500 font-semibold uppercase tracking-wider text-[10px]">
              <button
                onClick={() => setShowProjects(!showProjects)}
                className="flex items-center space-x-1 hover:text-warm-700 dark:hover:text-warm-300"
              >
                {showProjects ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span>Projects ({projects.length})</span>
              </button>
              <button
                onClick={onOpenNewProject}
                title="Create new project workspace"
                className="p-1 rounded hover:bg-warm-200 dark:hover:bg-warm-800 text-warm-500 hover:text-claude-coral"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            {showProjects && (
              <div className="space-y-0.5 mt-1">
                <button
                  onClick={() => onSelectProject(null)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center space-x-2 transition-colors ${
                    activeProjectId === null
                      ? 'bg-warm-200/70 dark:bg-warm-800 font-semibold text-warm-900 dark:text-warm-50'
                      : 'text-warm-600 dark:text-warm-400 hover:bg-warm-200/40 dark:hover:bg-warm-850'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-warm-400" />
                  <span className="truncate">All Conversations</span>
                </button>
                {projects.map((p) => {
                  const isActive = activeProjectId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`group relative flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
                        isActive
                          ? 'bg-warm-200/70 dark:bg-warm-800 font-semibold text-warm-900 dark:text-warm-50'
                          : 'text-warm-600 dark:text-warm-400 hover:bg-warm-200/40 dark:hover:bg-warm-850'
                      }`}
                    >
                      <button
                        onClick={() => onSelectProject(p.id)}
                        className="flex items-center space-x-2 flex-1 min-w-0 text-left"
                        title={p.description || p.name}
                      >
                        <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{p.name}</span>
                      </button>
                      <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                        {onEditProject && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditProject(p);
                            }}
                            title="Edit task & instructions"
                            className="p-1 rounded hover:bg-warm-300/60 dark:hover:bg-warm-700 text-warm-500 hover:text-warm-800 dark:hover:text-warm-200 transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                        {onDeleteProject && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete project "${p.name}"? Existing chats will be preserved.`)) {
                                onDeleteProject(p.id);
                              }
                            }}
                            title="Delete project"
                            className="p-1 rounded hover:bg-red-500/10 text-warm-500 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Starred Conversations */}
          {starred.length > 0 && (
            <div>
              <div className="px-2 py-1 text-warm-500 font-semibold uppercase tracking-wider text-[10px] flex items-center space-x-1">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>Starred</span>
              </div>
              <div className="space-y-0.5 mt-1">
                {starred.map((c) => renderConversationItem(c))}
              </div>
            </div>
          )}

          {/* Chronologically Grouped Conversations */}
          {nonArchived.length === 0 ? (
            <div className="px-4 py-8 text-center text-warm-400 text-xs">
              <p className="font-medium text-warm-500 mb-1">
                {activeProjectId ? 'No chats in this project yet' : 'No conversations yet'}
              </p>
              <p className="text-[11px] text-warm-400">
                Click "Start new chat" to begin.
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([label, items]) => (
              <div key={label}>
                <div className="px-2 py-1 text-warm-400 font-semibold uppercase tracking-wider text-[10px]">
                  {label}
                </div>
                <div className="space-y-0.5 mt-1">
                  {items.map((c) => renderConversationItem(c))}
                </div>
              </div>
            ))
          )}

          {/* Archived Drawer */}
          {archived.length > 0 && (
            <div className="pt-2 border-t border-warm-200/60 dark:border-warm-850">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="w-full text-left px-2 py-1 text-warm-500 font-semibold uppercase tracking-wider text-[10px] flex items-center justify-between hover:text-warm-700 dark:hover:text-warm-300"
              >
                <div className="flex items-center space-x-1">
                  <Archive className="w-3 h-3 text-warm-400" />
                  <span>Archived ({archived.length})</span>
                </div>
                {showArchived ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>

              {showArchived && (
                <div className="space-y-0.5 mt-1">
                  {archived.map((c) => renderConversationItem(c))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Profile & Settings */}
        <div className="p-3 border-t border-warm-200/60 dark:border-warm-850 bg-warm-100/50 dark:bg-warm-900/50 flex items-center justify-between">
          <button
            onClick={onOpenAuth}
            className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-warm-200 dark:hover:bg-warm-800 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-warm-300 dark:bg-warm-700 flex items-center justify-center text-xs font-semibold text-warm-800 dark:text-warm-200">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs">
              <div className="font-medium text-warm-900 dark:text-warm-100 truncate max-w-[120px]">
                Guest User
              </div>
              <div className="text-[10px] text-warm-500">Local / Cloud</div>
            </div>
          </button>

          <button
            onClick={onOpenSettings}
            title="Settings"
            className="p-2 rounded-xl text-warm-500 hover:text-warm-800 dark:hover:text-warm-200 hover:bg-warm-200 dark:hover:bg-warm-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );

  function renderConversationItem(c: Conversation) {
    const isSelected = c.id === activeConversationId;
    const isEditing = editingId === c.id;
    const isMenuOpen = activeMenuId === c.id;

    if (isEditing) {
      return (
        <div key={c.id} className="p-1">
          <div className="flex items-center space-x-1 bg-white dark:bg-warm-800 rounded-xl p-1 border border-claude-coral">
            <input
              type="text"
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename(c.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              className="w-full text-xs bg-transparent px-1 focus:outline-none"
            />
            <button
              onClick={() => handleSaveRename(c.id)}
              className="p-1 text-emerald-500 hover:bg-warm-100 dark:hover:bg-warm-700 rounded"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="p-1 text-warm-400 hover:bg-warm-100 dark:hover:bg-warm-700 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div key={c.id} className="relative group">
        <button
          onClick={() => {
            onSelectConversation(c.id);
            onCloseMobile();
          }}
          className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition-colors ${
            isSelected
              ? 'bg-warm-200/80 dark:bg-warm-800 font-semibold text-warm-900 dark:text-warm-50'
              : 'text-warm-700 dark:text-warm-300 hover:bg-warm-200/40 dark:hover:bg-warm-850'
          }`}
        >
          <span className="truncate pr-6 text-xs">{c.title}</span>
        </button>

        {/* Hover / Active Actions */}
        <div className="absolute right-1.5 top-1.5 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(c.id);
            }}
            title={c.is_starred ? 'Unstar' : 'Star'}
            className="p-1 rounded hover:bg-warm-300/60 dark:hover:bg-warm-700 text-warm-400 hover:text-amber-500"
          >
            <Star className={`w-3 h-3 ${c.is_starred ? 'text-amber-500 fill-amber-500' : ''}`} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuId(isMenuOpen ? null : c.id);
            }}
            className="p-1 rounded hover:bg-warm-300/60 dark:hover:bg-warm-700 text-warm-400"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>

        {/* Context Menu Dropdown */}
        {isMenuOpen && (
          <div className="absolute right-2 top-8 w-36 rounded-xl bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 shadow-warm-lg z-30 p-1 space-y-0.5 animate-in fade-in duration-100">
            <button
              onClick={() => startRename(c)}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-warm-100 dark:hover:bg-warm-800 flex items-center space-x-2 text-warm-800 dark:text-warm-200"
            >
              <Edit3 className="w-3 h-3" />
              <span>Rename</span>
            </button>
            <button
              onClick={() => {
                onToggleArchive(c.id);
                setActiveMenuId(null);
              }}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-warm-100 dark:hover:bg-warm-800 flex items-center space-x-2 text-warm-800 dark:text-warm-200"
            >
              <Archive className="w-3 h-3" />
              <span>{c.is_archived ? 'Unarchive' : 'Archive'}</span>
            </button>
            <button
              onClick={() => {
                onDeleteConversation(c.id);
                setActiveMenuId(null);
              }}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-red-500/10 flex items-center space-x-2 text-red-600"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    );
  }
};
