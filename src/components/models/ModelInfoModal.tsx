import React from 'react';
import { X, ShieldCheck, CheckCircle2, Layers, Cpu, Eye } from 'lucide-react';
import { VerifiedFreeModel } from '../../types';
import { formatContextLength } from '../../lib/utils';

interface ModelInfoModalProps {
  model: VerifiedFreeModel | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ModelInfoModal: React.FC<ModelInfoModalProps> = ({ model, isOpen, onClose }) => {
  if (!isOpen || !model) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 rounded-3xl max-w-lg w-full p-6 shadow-warm-lg">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-warm-150 dark:border-warm-800">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-serif font-semibold text-warm-900 dark:text-warm-50">
                {model.name}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                free
              </span>
            </div>
            <p className="text-xs text-warm-500 font-mono mt-1">{model.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-warm-400 hover:text-warm-800 dark:hover:text-warm-200 hover:bg-warm-100 dark:hover:bg-warm-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-4 text-sm">
          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-1">
              Description
            </h4>
            <p className="text-warm-700 dark:text-warm-300 leading-relaxed">
              {model.description}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800">
              <div className="flex items-center space-x-2 text-warm-500 text-xs mb-1">
                <Cpu className="w-4 h-4 text-claude-coral" />
                <span>Provider</span>
              </div>
              <span className="font-semibold text-warm-900 dark:text-warm-100">
                {model.provider}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800">
              <div className="flex items-center space-x-2 text-warm-500 text-xs mb-1">
                <Layers className="w-4 h-4 text-blue-500" />
                <span>Context Window</span>
              </div>
              <span className="font-semibold text-warm-900 dark:text-warm-100">
                {model.context_length.toLocaleString()} tokens (~{formatContextLength(model.context_length)})
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800">
              <div className="flex items-center space-x-2 text-warm-500 text-xs mb-1">
                <Eye className="w-4 h-4 text-amber-500" />
                <span>Multimodal Vision</span>
              </div>
              <span className="font-semibold text-warm-900 dark:text-warm-100">
                {model.supports_vision ? 'Supported' : 'Text Only'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-warm-50 dark:bg-warm-850 border border-warm-200 dark:border-warm-800">
              <div className="flex items-center space-x-2 text-warm-500 text-xs mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Pricing</span>
              </div>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                $0.00 / 1M tokens
              </span>
            </div>
          </div>

          {/* Strict Verification Checklist */}
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2 text-xs">
            <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Architectural Free-Model Compliance</span>
            </h4>
            <div className="space-y-1 text-emerald-700 dark:text-emerald-400">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Model ID ends explicitly with <code>:free</code></span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified $0 prompt and $0 completion fees</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Fail-closed backend policy: Never silently fallback to paid tier</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-warm-150 dark:border-warm-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-warm-200 hover:bg-warm-300 dark:bg-warm-800 dark:hover:bg-warm-700 text-warm-900 dark:text-warm-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

