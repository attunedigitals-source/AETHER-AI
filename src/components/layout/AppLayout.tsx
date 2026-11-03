import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { WelcomeScreen } from '../chat/WelcomeScreen';
import { MessageList } from '../chat/MessageList';
import { ChatInput } from '../chat/ChatInput';
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

  // Chat hook
  const {
    conversations,
    activeConversation,
    activeConversationId,
    messages,
    isStreaming,
    streamingContent,
    searchFilter,
    setSearchFilter,
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
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');

  const handleClearAllChats = async () => {
    await api.deleteAllConversations();
    startNewChat();
    window.location.reload();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAF9F5] dark:bg-[#1C1B18] text-warm-900 dark:text-warm-50 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onStartNewChat={startNewChat}
        onRenameConversation={renameConversation}
        onToggleStar={toggleStarConversation}
        onToggleArchive={toggleArchiveConversation}
        onDeleteConversation={deleteConversation}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onOpenNewProject={() => setIsProjectModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        searchQuery={searchFilter}
        onSearchChange={setSearchFilter}
        isOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* API Key Missing Banner */}
        <ApiKeySetupBanner onOpenSettings={() => setIsSettingsOpen(true)} />

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

        {/* Chat / Welcome Area */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {messages.length === 0 ? (
            <WelcomeScreen
              selectedModel={selectedModel}
              onSelectPrompt={(text) => setSelectedPrompt(text)}
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
            />
          )}

          {/* Composer Input Area */}
          <ChatInput
            onSendMessage={sendMessage}
            onStopGeneration={stopGeneration}
            isStreaming={isStreaming}
            selectedModel={selectedModel}
            initialPrompt={selectedPrompt}
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
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSignOut={() => {}}
      />
    </div>
  );
};

