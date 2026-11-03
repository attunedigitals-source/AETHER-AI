import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { WelcomeScreen } from '../chat/WelcomeScreen';
import { MessageList } from '../chat/MessageList';
import { ChatInput } from '../chat/ChatInput';
import { TaskProgressBar } from '../chat/TaskProgressBar';
import { ApiKeySetupBanner } from '../settings/ApiKeySetupBanner';
import { ModelInfoModal } from '../models/ModelInfoModal';
import { ModelCompareModal } from '../chat/ModelCompareModal';
import { ShareModal } from '../chat/ShareModal';
import { ProjectModal } from '../projects/ProjectModal';
import { SettingsModal } from '../settings/SettingsModal';
import { AuthModal } from '../auth/AuthModal';
import { useModels } from '../../hooks/useModels';
import { useProjects } from '../../hooks/useProjects';
import { useChat } from '../../hooks/useChat';
import { useTheme } from '../../hooks/useTheme';
import { UserSettings } from '../../types';
import { api } from '../../lib/storage';

export const AppLayout: React.FC = () => {
  const { theme, toggleTheme, setTheme } = useTheme();

  // Model hook
  const {
    models,
    selectedModel,
    selectedModelId,
    selectModel,
    refreshModels,
    isRefreshing,
  } = useModels();

  // Projects hook
  const {
    projects,
    activeProject,
    activeProjectId,
    setActiveProjectId,
    createProject,
    updateProject,
    deleteProject,
  } = useProjects();

  // User Settings state
  const [settings, setSettings] = useState<UserSettings | null>(null);

  React.useEffect(() => {
    api.getSettings().then(setSettings).catch(console.error);
  }, []);

  const handleUpdateSettings = async (updates: Partial<UserSettings>) => {
    const updated = await api.updateSettings(updates);
    setSettings(updated);
  };

  // Chat hook with resilient task tracking & continuity
  const {
    conversations,
    activeConversation,
    activeConversationId,
    messages,
    isStreaming,
    streamingContent,
    searchFilter,
    setSearchFilter,
    taskState,
    resumeTask,
    sendMessage,
    stopGeneration,
    startNewChat,
    selectConversation,
    regenerateMessage,
    editUserMessage,
    setMessageFeedback,
    renameConversation,
    toggleStarConversation,
    toggleArchiveConversation,
    deleteConversation,
    deleteAllConversations,
  } = useChat({
    selectedModelId,
    activeProjectId,
    projectInstructions: activeProject?.custom_instructions,
    globalInstructions: settings?.custom_instructions,
  });

  // UI modal states
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isModelInfoOpen, setIsModelInfoOpen] = useState(false);
  const [isModelCompareOpen, setIsModelCompareOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'ai' | 'openrouter' | 'data'>('general');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');

  const handleOpenSettings = (tab: 'general' | 'ai' | 'openrouter' | 'data' = 'general') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  const handleClearAllChats = async () => {
    await deleteAllConversations();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-warm-50 dark:bg-warm-900 text-warm-900 dark:text-warm-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onStartNewChat={startNewChat}
        onDeleteConversation={deleteConversation}
        onToggleStar={toggleStarConversation}
        onToggleArchive={toggleArchiveConversation}
        onRenameConversation={renameConversation}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onOpenNewProject={() => setIsProjectModalOpen(true)}
        onOpenSettings={() => handleOpenSettings('general')}
        onOpenAuth={() => setIsAuthOpen(true)}
        searchQuery={searchFilter}
        onSearchChange={setSearchFilter}
        isOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* API Key Missing Banner */}
        <ApiKeySetupBanner onOpenSettings={(tab) => handleOpenSettings(tab || 'openrouter')} />

        {/* Top Header */}
        <Header
          conversation={activeConversation}
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={selectModel}
          onRefreshModels={refreshModels}
          isRefreshing={isRefreshing}
          onOpenModelInfo={() => setIsModelInfoOpen(true)}
          onOpenModelCompare={() => setIsModelCompareOpen(true)}
          onOpenShare={() => setIsShareOpen(true)}
          onRenameConversation={renameConversation}
          activeProject={activeProject}
          onToggleSidebarMobile={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Task Framework Progress & Interruption Recovery Bar */}
        <TaskProgressBar
          taskState={taskState}
          onResumeTask={() => resumeTask()}
          isStreaming={isStreaming}
        />

        {/* Chat / Welcome Area */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {messages.length === 0 ? (
            <WelcomeScreen
              selectedModel={selectedModel}
              onSelectPrompt={(text) => setSelectedPrompt(text)}
              activeProject={activeProject}
              onEditProject={() => setIsProjectModalOpen(true)}
            />
          ) : (
            <MessageList
              messages={messages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              freeModels={models}
              onRegenerate={regenerateMessage}
              onEdit={editUserMessage}
              onFeedback={setMessageFeedback}
              onResumeTask={resumeTask}
            />
          )}

          {/* Composer Input Area */}
          <ChatInput
            onSendMessage={sendMessage}
            onStopGeneration={stopGeneration}
            isStreaming={isStreaming}
            selectedModel={selectedModel}
            initialPrompt={selectedPrompt}
            taskState={taskState}
            onResumeTask={() => resumeTask()}
          />
        </main>
      </div>

      {/* Modals */}
      <ModelInfoModal
        model={selectedModel}
        isOpen={isModelInfoOpen}
        onClose={() => setIsModelInfoOpen(false)}
      />

      <ModelCompareModal
        isOpen={isModelCompareOpen}
        onClose={() => setIsModelCompareOpen(false)}
        freeModels={models}
      />

      <ShareModal
        conversation={activeConversation}
        messages={messages}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={async (name, description, instructions) => {
          await createProject(name, description, instructions);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        freeModels={models}
        theme={theme}
        onSetTheme={setTheme}
        onClearAllChats={handleClearAllChats}
        initialTab={settingsTab}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSignOut={() => {}}
      />
    </div>
  );
};
