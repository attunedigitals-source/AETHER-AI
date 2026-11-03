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
} from 'lucide-react';
import { VerifiedFreeModel } from '../../types';

interface WelcomeScreenProps {
  selectedModel: VerifiedFreeModel | null;
  onSelectPrompt: (promptText: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  selectedModel,
  onSelectPrompt,
}) => {
  const promptSuggestions = [
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

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-4xl mx-auto w-full select-none">
      {/* Brand Icon Emblem */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-claude-coral via-amber-500 to-amber-200 p-0.5 shadow-warm-md mb-6">
        <div className="w-full h-full bg-[#FAF9F5] dark:bg-[#1C1B18] rounded-[14px] flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-claude-coral" />
        </div>
      </div>

      {/* Greeting Title */}
      <h1 className="text-3xl md:text-4xl font-serif font-medium text-warm-900 dark:text-warm-50 text-center mb-3 tracking-tight">
        What can I help you with today?
      </h1>

      {/* Free Tier Assurance Banner */}
      <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-8 border border-emerald-500/20">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>100% Free OpenRouter Model: <strong>{selectedModel?.name || 'Llama 3.3 70B'}</strong> ($0/token)</span>
      </div>

      {/* Prompt Suggestion Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-3xl">
        {promptSuggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(item.prompt)}
            className="group text-left p-4 rounded-2xl bg-white dark:bg-warm-850 border border-warm-200 dark:border-warm-800 hover:border-claude-coral/40 dark:hover:border-claude-coral/40 shadow-sm hover:shadow-warm-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 rounded-xl bg-warm-100 dark:bg-warm-800 group-hover:scale-105 transition-transform">
                {item.icon}
              </div>
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

