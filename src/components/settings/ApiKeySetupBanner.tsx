import React, { useState, useEffect } from 'react';
import { KeyRound, ExternalLink, Settings, X } from 'lucide-react';

interface ApiKeySetupBannerProps {
  onOpenSettings: () => void;
}

export const ApiKeySetupBanner: React.FC<ApiKeySetupBannerProps> = ({ onOpenSettings }) => {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHasApiKey(data.has_api_key);
      })
      .catch(() => {
        setHasApiKey(false);
      });
  }, []);

  if (hasApiKey === true || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs flex items-center justify-between z-20">
      <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200">
        <KeyRound className="w-4 h-4 text-claude-coral flex-shrink-0" />
        <span>
          <strong>OpenRouter API Key Required:</strong> To stream responses with free models, configure your free API key in your <code>.env</code> file.
        </span>
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
        <a
          href="https://openrouter.ai/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center space-x-1 text-claude-coral hover:underline font-medium"
        >
          <span>Get Free Key</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        <button
          onClick={onOpenSettings}
          className="px-2.5 py-1 rounded-lg bg-claude-coral hover:bg-claude-coral-hover text-white font-medium flex items-center space-x-1 transition-colors"
        >
          <Settings className="w-3 h-3" />
          <span>Setup</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-warm-400 hover:text-warm-700 dark:hover:text-warm-200"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

