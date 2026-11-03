import { useState, useEffect, useCallback, useRef } from 'react';
import { Conversation, Message, Attachment } from '../types';
import { api, getHeaders } from '../lib/storage';
import { generateId } from '../lib/utils';

interface UseChatProps {
  selectedModelId: string;
  activeProjectId: string | null;
  projectInstructions?: string;
  globalInstructions?: string;
}

export function useChat({
  selectedModelId,
  activeProjectId,
  projectInstructions,
  globalInstructions,
}: UseChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);
      const data = await api.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    let isCurrent = true;
    api
      .getConversation(activeConversationId)
      .then((data) => {
        if (isCurrent && data) {
          setMessages(data.messages || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load conversation details:', err);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeConversationId]);

  // Start a new chat
  const startNewChat = useCallback(() => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    setActiveConversationId(null);
    setMessages([]);
    setStreamingContent('');
  }, [isStreaming]);

  // Select conversation
  const selectConversation = useCallback(
    (id: string) => {
      if (id === activeConversationId) return;
      if (isStreaming) {
        abortControllerRef.current?.abort();
        setIsStreaming(false);
      }
      setActiveConversationId(id);
      setStreamingContent('');
    },
    [activeConversationId, isStreaming]
  );

  // Stop streaming
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (
      content: string,
      attachments: Attachment[] = [],
      overrideModelId?: string,
      existingConvId?: string
    ) => {
      if (!content.trim() && attachments.length === 0) return;

      const modelToUse = overrideModelId || selectedModelId;
      let convId = existingConvId || activeConversationId;

      // Create conversation on the fly if new
      if (!convId) {
        const title =
          content.trim().length > 40
            ? content.trim().substring(0, 40) + '...'
            : content.trim() || 'New Conversation';

        const newConv = await api.createConversation({
          title,
          model_id: modelToUse,
          project_id: activeProjectId,
        });

        convId = newConv.id;
        setActiveConversationId(convId);
        setConversations((prev) => [newConv, ...prev]);
      }

      // Create user message
      const userMessageId = generateId('msg-user');
      const userMsg: Message = {
        id: userMessageId,
        conversation_id: convId,
        role: 'user',
        content,
        attachments,
        model_id: modelToUse,
        created_at: new Date().toISOString(),
      };

      // Optimistically append user message
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      await api.saveMessage(userMsg);

      // Assistant placeholder
      const assistantMessageId = generateId('msg-asst');
      const assistantMsg: Message = {
        id: assistantMessageId,
        conversation_id: convId,
        role: 'assistant',
        content: '',
        model_id: modelToUse,
        created_at: new Date().toISOString(),
        versions: [''],
        activeVersionIndex: 0,
      };

      setMessages([...updatedMessages, assistantMsg]);
      setIsStreaming(true);
      setStreamingContent('');

      // Build system prompt combination
      const systemPrompts = [];
      if (globalInstructions?.trim()) systemPrompts.push(globalInstructions.trim());
      if (projectInstructions?.trim()) systemPrompts.push(`[Project Context]:\n${projectInstructions.trim()}`);
      const combinedSystemPrompt = systemPrompts.join('\n\n');

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            modelId: modelToUse,
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
              attachments: m.attachments,
            })),
            systemPrompt: combinedSystemPrompt,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${response.status}: Failed to generate`);
        }

        if (!response.body) throw new Error('No response stream received');

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullContent = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                fullContent += `\n\n> ⚠️ **Notice**: ${parsed.error.message}\n`;
                setStreamingContent(fullContent);
              } else if (parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
            } catch (_) { }
          }
        }

        // Finalize assistant message
        const finalAssistantMsg: Message = {
          ...assistantMsg,
          content: fullContent,
          versions: [fullContent],
          activeVersionIndex: 0,
        };

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMessageId ? finalAssistantMsg : m))
        );

        await api.saveMessage(finalAssistantMsg);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Stream stopped by user.');
        } else {
          console.error('Streaming error:', err);
          const errorMsg = `\n\n> ⚠️ **Error**: ${err.message || 'Unable to complete request'}`;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: (m.content || '') + errorMsg }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
        abortControllerRef.current = null;
        loadConversations();
      }
    },
    [
      activeConversationId,
      messages,
      selectedModelId,
      activeProjectId,
      projectInstructions,
      globalInstructions,
      loadConversations,
    ]
  );

  // Regenerate message
  const regenerateMessage = useCallback(
    async (messageId: string, alternateModelId?: string) => {
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;

      const targetMsg = messages[idx];
      let promptMessage: Message | null = null;

      // If user clicks regenerate on assistant message, find preceding user turn
      if (targetMsg.role === 'assistant') {
        promptMessage = messages.slice(0, idx).reverse().find((m) => m.role === 'user') || null;
      } else {
        promptMessage = targetMsg;
      }

      if (!promptMessage) return;

      const modelToUse = alternateModelId || targetMsg.model_id || selectedModelId;

      // Slice context up to promptMessage
      const promptIdx = messages.findIndex((m) => m.id === promptMessage!.id);
      const contextMessages = messages.slice(0, promptIdx + 1);

      setIsStreaming(true);
      setStreamingContent('');

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            modelId: modelToUse,
            messages: contextMessages.map((m) => ({
              role: m.role,
              content: m.content,
              attachments: m.attachments,
            })),
          }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const reader = response.body!.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullContent = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
            } catch (_) { }
          }
        }

        // Update assistant message with new version
        setMessages((prev) => {
          return prev.map((m) => {
            if (m.id === messageId) {
              const currentVersions = m.versions || [m.content];
              const newVersions = [...currentVersions, fullContent];
              return {
                ...m,
                content: fullContent,
                model_id: modelToUse,
                versions: newVersions,
                activeVersionIndex: newVersions.length - 1,
              };
            }
            return m;
          });
        });

        // Persist updated message
        await api.saveMessage({
          id: messageId,
          conversation_id: targetMsg.conversation_id,
          role: 'assistant',
          content: fullContent,
          model_id: modelToUse,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Regenerate error:', err);
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
        abortControllerRef.current = null;
      }
    },
    [messages, selectedModelId]
  );

  // Edit user message (branching)
  const editUserMessage = useCallback(
    async (messageId: string, newContent: string) => {
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;

      const target = messages[idx];
      // Keep previous messages before target
      const truncatedMessages = messages.slice(0, idx);
      setMessages(truncatedMessages);

      // Resend with new content
      await sendMessage(newContent, target.attachments, target.model_id || undefined, target.conversation_id);
    },
    [messages, sendMessage]
  );

  // Feedback (thumbs up / down)
  const setMessageFeedback = useCallback((messageId: string, feedback: 'like' | 'dislike' | null) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback } : m))
    );
  }, []);

  // Conversation mutations
  const renameConversation = async (id: string, title: string) => {
    await api.updateConversation(id, { title });
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  };

  const toggleStarConversation = async (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    const is_starred = !conv.is_starred;
    await api.updateConversation(id, { is_starred });
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, is_starred } : c)));
  };

  const toggleArchiveConversation = async (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    const is_archived = !conv.is_archived;
    await api.updateConversation(id, { is_archived });
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, is_archived } : c)));
  };

  const deleteConversation = async (id: string) => {
    await api.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      startNewChat();
    }
  };

  const deleteAllConversations = async () => {
    await api.deleteAllConversations();
    setConversations([]);
    startNewChat();
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  // Filtered conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchFilter.trim()) return true;
    return c.title.toLowerCase().includes(searchFilter.toLowerCase());
  });

  return {
    conversations: filteredConversations,
    allConversations: conversations,
    activeConversation,
    activeConversationId,
    messages,
    isStreaming,
    streamingContent,
    isLoadingConversations,
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
    refreshConversations: loadConversations,
  };
}
