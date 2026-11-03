import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Play,
  RotateCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { TaskFrameworkState } from '../../types';

interface TaskProgressBarProps {
  taskState: TaskFrameworkState;
  onResumeTask: () => void;
  isStreaming: boolean;
}

export const TaskProgressBar: React.FC<TaskProgressBarProps> = ({
  taskState,
  onResumeTask,
  isStreaming,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!taskState.isConfigured && !taskState.isInterrupted) {
    return null;
  }

  return (
    <div className="w-full bg-white/80 dark:bg-warm-900/80 backdrop-blur-md border-b border-warm-200 dark:border-warm-800 py-2 px-4 transition-all z-20">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        {/* Left: Framework Name & Stage Pills */}
        <div className="flex items-center space-x-2.5 min-w-0 flex-wrap">
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-claude-coral/10 text-claude-coral font-medium">
            <Layers className="w-3.5 h-3.5" />
            <span className="font-semibold tracking-wide truncate max-w-[130px] sm:max-w-none">
              {taskState.frameworkName}
            </span>
          </div>

          {/* Stage Sequence Pills */}
          {taskState.stages && taskState.stages.length > 1 && (
            <div className="hidden md:flex items-center space-x-1.5">
              {taskState.stages.map((st, i) => (
                <React.Fragment key={st.id}>
                  {i > 0 && <span className="text-warm-400 text-[10px]">→</span>}
                  <div
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] transition-colors ${
                      st.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium'
                        : st.status === 'active'
                        ? 'bg-claude-coral text-white font-semibold shadow-xs'
                        : 'bg-warm-150 dark:bg-warm-800 text-warm-500'
                    }`}
                  >
                    {st.status === 'completed' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    ) : st.status === 'active' ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    ) : (
                      <Circle className="w-2.5 h-2.5 text-warm-400" />
                    )}
                    <span>{st.shortTitle}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Active Stage Label on Mobile */}
          <div className="md:hidden text-[11px] text-warm-600 dark:text-warm-300 font-medium">
            Stage {taskState.stageIndex}/{taskState.totalStages}: {taskState.currentStage}
          </div>
        </div>

        {/* Right: Status / Interruption Action */}
        <div className="flex items-center space-x-2 flex-shrink-0 justify-between sm:justify-end">
          {taskState.isInterrupted ? (
            <div className="flex items-center space-x-2">
              <span className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Interrupted by network</span>
              </span>
              <button
                onClick={onResumeTask}
                disabled={isStreaming}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-claude-coral hover:bg-claude-coral-hover disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-all active:scale-95"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Resume Task</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-warm-500 text-[11px]">
              <span className="truncate max-w-[200px]" title={taskState.pendingDeliverable}>
                Next: {taskState.pendingDeliverable || 'Execute next step'}
              </span>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded hover:bg-warm-200/50 dark:hover:bg-warm-800 transition-colors"
                title="View framework details"
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Framework Details Drawer */}
      {isExpanded && (
        <div className="max-w-4xl mx-auto mt-2 pt-2 border-t border-warm-200 dark:border-warm-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-warm-600 dark:text-warm-400 animate-in fade-in duration-200">
          <div>
            <span className="font-semibold text-warm-900 dark:text-warm-100">Active Stage:</span>{' '}
            {taskState.currentStage}
          </div>
          <div>
            <span className="font-semibold text-warm-900 dark:text-warm-100">Last Milestone:</span>{' '}
            {taskState.lastMilestone || 'Starting workflow'}
          </div>
        </div>
      )}
    </div>
  );
};

