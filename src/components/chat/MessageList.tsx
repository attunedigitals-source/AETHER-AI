import React, { useEffect, useRef } from 'react';
import { Message, VerifiedFreeModel } from '../../types';
import { MessageItem } from './MessageItem';
import { Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent?: string;
  freeModels: VerifiedFreeModel[];
  onRegenerate: (messageId: string, alternateModelId?: string) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onFeedback: (messageId: string, feedback: 'like' | 'dislike' | null) => void;
  onResumeTask?: (messageId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isStreaming,
  streamingContent,
  freeModels,
  onRegenerate,
  onEdit,
  onFeedback,
  onResumeTask,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages or streaming chunks
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto pb-4 scroll-smooth">
      {messages.map((message) => {
        // If this message is the currently streaming assistant message, feed the live stream
        const isCurrentlyStreamingMsg =
          isStreaming &&
          message.role === 'assistant' &&
          message === messages[messages.length - 1];

        const displayMessage = isCurrentlyStreamingMsg
          ? { ...message, content: streamingContent || message.content }
          : message;

        return (
          <MessageItem
            key={message.id}
            message={displayMessage}
            freeModels={freeModels}
            onRegenerate={onRegenerate}
            onEdit={onEdit}
            onFeedback={onFeedback}
            onResumeTask={onResumeTask}
          />
        );
      })}

      {isStreaming && (!streamingContent || streamingContent.length === 0) && (
        <div className="py-4 px-6 flex items-center justify-center space-x-2 text-sm text-warm-500">
          <Loader2 className="w-4 h-4 animate-spin text-claude-coral" />
          <span>Generating response with free model...</span>
        </div>
      )}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
};
