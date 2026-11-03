import React from 'react';
import {
  PenTool,
  BookOpen,
  Code2,
  FileSearch,
  Lightbulb,
  Search,
  Sparkles,
  ShieldCheck,
  Folder,
  Play,
  Settings,
  Layers,
  Zap,
} from 'lucide-react';
import { Project, VerifiedFreeModel, OPENROUTER_FREE_ROUTER_ID } from '../../types';

interface PromptSuggestion {
  title: string;
  description: string;
  prompt: string;
  icon?: React.ReactNode;
}

interface WelcomeScreenProps {
  selectedModel: VerifiedFreeModel | null;
  onSelectPrompt: (promptText: string) => void;
  activeProject?: Project | null;
  onEditProject?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  selectedModel,
  onSelectPrompt,
  activeProject,
  onEditProject,
}) => {
  const defaultSuggestions: PromptSuggestion[] = [
    {
      title: 'Help me write something',
      description: 'Draft essays, emails, blog posts, or editorial stories',
      icon: <PenTool className="w-5 h-5 text-amber-500" />,
      prompt: 'Help me draft an engaging, well-structured announcement about...',
    },
    {
      title: 'Explain a complicated topic',
      description: 'Break down quantum computing, neural networks, or economics',
      icon: <BookOpen className="w-5 h-5 text-emerald-500" />,
      prompt: 'Explain how Large Language Models work in intuitive terms with concrete analogies.',
    },
    {
      title: 'Write and debug code',
      description: 'Generate clean TypeScript, Python, solve bugs, or design algorithms',
      icon: <Code2 className="w-5 h-5 text-blue-500" />,
      prompt: 'Write a robust TypeScript function to perform deep object merging with cycle detection.',
    },
    {
      title: 'Analyze a document',
      description: 'Extract insights, summarize data, or analyze PDFs and spreadsheets',
      icon: <FileSearch className="w-5 h-5 text-indigo-500" />,
      prompt: 'I will provide a document. Please extract the key findings, potential risks, and action items.',
    },
    {
      title: 'Brainstorm creative ideas',
      description: 'Generate product concepts, naming ideas, or marketing hooks',
      icon: <Lightbulb className="w-5 h-5 text-orange-500" />,
      prompt: 'Give me 10 innovative product concepts that leverage AI to solve everyday workflow problems.',
    },
    {
      title: 'Research a topic',
      description: 'Synthesize research, compare perspectives, and structure findings',
      icon: <Search className="w-5 h-5 text-rose-500" />,
      prompt: 'Provide a comprehensive research briefing on the current state of renewable energy storage systems.',
    },
  ];

  const insightForgeSuggestions: PromptSuggestion[] = [
    {
      title: 'Human History & Anthropology',
      description: 'Ancient civilizations, evolutionary milestones, and forgotten tools',
      prompt: '1',
    },
    {
      title: 'Psychology & Neuroscience',
      description: 'Cognitive paradoxes, memory quirks, and human behavior mechanisms',
      prompt: '2',
    },
    {
      title: 'Philosophy & Big Questions',
      description: 'Mind-bending paradoxes, ethics, and fundamental inquiries',
      prompt: '3',
    },
    {
      title: 'Astronomy & Deep Time',
      description: 'Cosmic scale, black holes, and planetary mysteries',
      prompt: '4',
    },
    {
      title: 'Science & Everyday Mysteries',
      description: 'Hidden physics, engineering wonders, and counterintuitive facts',
      prompt: '5',
    },
    {
      title: 'Custom Explainer Topic',
      description: 'Propose your own niche subject or specific question to develop',
      prompt: '6',
    },
  ];

  const isInsightForge = activeProject?.name?.toLowerCase().includes('insightforge');
  const suggestions = isInsightForge ? insightForgeSuggestions : defaultSuggestions;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-4xl mx-auto w-full select-none overflow-y-auto">
      {/* Brand Icon Emblem */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-claude-coral via-amber-500 to-amber-200 p-0.5 shadow-warm-md mb-4">
        <div className="w-full h-full bg-[#FAF9F5] dark:bg-[#1C1B18] rounded-[14px] flex items-center justify-center">
          {activeProject ? (
            <Folder className="w-8 h-8 text-amber-500" />
          ) : (
            <Sparkles className="w-8 h-8 text-claude-coral" />
          )}
        </div>
      </div>

      {/* Greeting Title */}
      <h1 className="text-3xl md:text-4xl font-serif font-medium text-warm-900 dark:text-warm-50 text-center mb-2 tracking-tight">
        {activeProject ? activeProject.name : 'What can I help you with today?'}
      </h1>

      {/* Project Description or Subtitle */}
      {activeProject ? (
        <p className="text-sm text-warm-600 dark:text-warm-400 text-center max-w-xl mb-4">
          {activeProject.description || 'Specialized task instructions active for all chats in this project.'}
        </p>
      ) : null}

      {/* Badges Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        {selectedModel?.id === OPENROUTER_FREE_ROUTER_ID || selectedModel?.id === 'auto:free' || selectedModel?.id === 'auto' ? (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium border border-amber-500/20">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Model Routing: <strong>Free Models Router (openrouter/free)</strong> — Auto Selection &amp; Failover</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Active Free Model: <strong>{selectedModel?.name || 'Free Models Router (openrouter/free)'}</strong></span>
          </div>
        )}

        {activeProject && (
          <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium border border-amber-500/20">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Custom Instructions Loaded</span>
          </div>
        )}
      </div>

      {/* Active Project Action Button */}
      {activeProject && (
        <div className="flex items-center space-x-3 mb-6">
          <button
            onClick={() => onSelectPrompt('Start')}
            className="px-5 py-2.5 rounded-2xl bg-claude-coral hover:bg-claude-coral-hover text-white text-xs font-semibold flex items-center space-x-2 shadow-warm-md hover:shadow-warm-lg transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Workflow / Show Menu</span>
          </button>

          {onEditProject && (
            <button
              onClick={onEditProject}
              className="px-4 py-2.5 rounded-2xl bg-warm-100 dark:bg-warm-800 hover:bg-warm-200 dark:hover:bg-warm-700 text-warm-700 dark:text-warm-300 text-xs font-medium flex items-center space-x-1.5 transition-colors border border-warm-200 dark:border-warm-700"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Edit Instructions</span>
            </button>
          )}
        </div>
      )}

      {/* Prompt Suggestion Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-3xl">
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(item.prompt)}
            className="group text-left p-4 rounded-2xl bg-white dark:bg-warm-850 border border-warm-200 dark:border-warm-800 hover:border-claude-coral/40 dark:hover:border-claude-coral/40 shadow-sm hover:shadow-warm-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-center space-x-3 mb-2">
              {item.icon ? (
                <div className="p-2 rounded-xl bg-warm-100 dark:bg-warm-800 group-hover:scale-105 transition-transform">
                  {item.icon}
                </div>
              ) : (
                <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold flex items-center justify-center">
                  {item.prompt}
                </span>
              )}
              <h3 className="font-medium text-sm text-warm-800 dark:text-warm-200 group-hover:text-claude-coral transition-colors">
                {item.title}
              </h3>
            </div>
            <p className="text-xs text-warm-500 dark:text-warm-400 line-clamp-2">
              {item.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
