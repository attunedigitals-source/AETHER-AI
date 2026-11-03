import React, { useState } from 'react';
import { X, LogIn, UserPlus, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
  onSignOut: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  onSignOut,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (!isSupabaseConfigured || !supabase) {
      setMessage({
        text: 'Supabase credentials are not configured in your environment. You are operating seamlessly in local persistent mode.',
        isError: false,
      });
      return;
    }

    try {
      setIsLoading(true);
      setMessage(null);

      if (isSignUp) {
        const { error } = await (supabase.auth as any).signUp({ email, password });
        if (error) throw error;
        setMessage({
          text: 'Account created! Please check your email to confirm your account.',
          isError: false,
        });
      } else {
        const { error } = await (supabase.auth as any).signInWithPassword({ email, password });
        if (error) throw error;
        setMessage({ text: 'Signed in successfully!', isError: false });
        setTimeout(() => onClose(), 1000);
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Authentication error', isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-3xl max-w-sm w-full p-6 shadow-warm-lg">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-warm-150 dark:border-warm-800">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-claude-coral" />
            <h2 className="text-lg font-serif font-semibold text-warm-900 dark:text-warm-50">
              {userEmail ? 'Account Profile' : isSignUp ? 'Create Account' : 'Sign In'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-warm-400 hover:text-warm-800 dark:hover:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {userEmail ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-warm-200 dark:bg-warm-800 mx-auto flex items-center justify-center text-xl font-semibold text-warm-700 dark:text-warm-200">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-warm-900 dark:text-warm-100">{userEmail}</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                ✓ Supabase Authenticated
              </div>
            </div>
            <button
              onClick={() => {
                onSignOut();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-4 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full px-3.5 py-2 rounded-xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 text-xs focus:outline-none focus:ring-2 focus:ring-claude-coral/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-700 text-xs focus:outline-none focus:ring-2 focus:ring-claude-coral/40"
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start space-x-2 ${
                  message.isError
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {message.isError ? (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-claude-coral hover:bg-claude-coral-hover text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setMessage(null);
                }}
                className="text-xs text-warm-500 hover:text-claude-coral transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
