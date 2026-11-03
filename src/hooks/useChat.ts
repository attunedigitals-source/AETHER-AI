import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Conversation, Message, Attachment, TaskFrameworkState } from '../types';
import { api, getHeaders } from '../lib/storage';
import { generateId } from '../lib/utils';
import {
  analyzeTaskFrameworkState,
  buildTaskContinuationPrompt,
  mergeResumedContent,
} from '../lib/taskFramework';

const ACTIVE_CONVERSATION_KEY = 'aether_active_conversation_id';

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
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_CONVERSATION_KEY) || null;
    } catch (_) {
      return null;
    }
  });

  const setActiveConversationId = useCallback((id: string | null) => {
    setActiveConversationIdState(id);
    try {
      if (id) {
        localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
      } else {
        localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
      }
    } catch (_) {}
  }, []);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const skipLoadMessagesRef = useRef<string | null>(null);

  // Compute active task framework state from conversation history & instructions
  const taskState = useMemo<TaskFrameworkState>(() => {
    return analyzeTaskFrameworkState(messages, projectInstructions);
  }, [messages, projectInstructions]);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);
      const data = await api.getConversations();
      setConversations(data);
      if (activeConversationId && !data.some((c) => c.id === activeConversationId)) {
        setActiveConversationId(null);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [activeConversationId, setActiveConversationId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    // Skip reload if this conversation was just created and populated by sendMessage
    if (skipLoadMessagesRef.current === activeConversationId) {
      skipLoadMessagesRef.current = null;
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
    }
    setActiveConversationId(null);
    setMessages([]);
    setStreamingContent('');
    setIsStreaming(false);
  }, [isStreaming, setActiveConversationId]);

  // Select existing conversation
  const selectConversation = useCallback(
    (id: string) => {
      if (isStreaming) {
        abortControllerRef.current?.abort();
      }
      setActiveConversationId(id);
      setStreamingContent('');
      setIsStreaming(false);
    },
    [isStreaming, setActiveConversationId]
  );

  // Stop ongoing streaming generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Build combined system prompt
  const buildSystemPrompt = useCallback(() => {
    const prompts: string[] = [];

    prompts.push(
      'You are Aether AI, a sophisticated, thoughtful, and highly capable AI research and creative assistant.'
    );

    if (globalInstructions?.trim()) {
      prompts.push(`[GLOBAL PREFERENCES]:\n${globalInstructions.trim()}`);
    }

    if (projectInstructions?.trim()) {
      let sanitized = projectInstructions.replace(
        /Do not dump raw script text into the chat stream if it exceeds 300 words\. Always format long-form script deliverables inside downloadable files/gi,
        'Deliver the complete narration script inside a downloadable file block named script_[short_topic_slug].txt. The chat environment automatically provides a 1-click Download button for the file.'
      );
      prompts.push(sanitized.trim());
    }
    return prompts.join('\n\n---\n\n');
  }, [globalInstructions, projectInstructions]);

  // Send a message & stream response with resilience
  const sendMessage = useCallback(
    async (
      content: string,
      attachments: Attachment[] = [],
      customModelId?: string,
      targetConvId?: string
    ) => {
      if (isStreaming) return;

      const modelToUse = customModelId || selectedModelId;
      let convId = targetConvId || activeConversationId;

      // Create conversation if starting fresh
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
        skipLoadMessagesRef.current = newConv.id;
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
      api.saveMessage(userMsg).catch((e) => console.error('Failed to save user message:', e));

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

      const combinedSystemPrompt = buildSystemPrompt();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      let fullContent = '';
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

        // Finalize completed response
        const finalAssistantMsg: Message = {
          ...assistantMsg,
          content: fullContent,
          is_interrupted: false,
          versions: [fullContent],
          activeVersionIndex: 0,
        };

        setMessages((prev) => {
          const exists = prev.some((m) => m.id === assistantMessageId);
          return exists
            ? prev.map((m) => (m.id === assistantMessageId ? finalAssistantMsg : m))
            : [...prev, finalAssistantMsg];
        });

        api.saveMessage(finalAssistantMsg).catch((e) => console.error('Failed to save assistant message:', e));
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Stream stopped by user.');
        } else {
          console.error('Streaming error:', err);
        }

        // If partial tokens were received, save them safely and flag as interrupted for 1-click continuation
        if (fullContent && fullContent.trim().length > 0) {
          const cleanPartial = fullContent.replace(/\n\n> ⚠️ \*\*Error\*\*[\s\S]*$/gi, '').trimEnd();
          const interruptedMsg: Message = {
            ...assistantMsg,
            content: cleanPartial,
            is_interrupted: true,
            interrupted_reason: err.message || 'network_error',
            versions: [cleanPartial],
            activeVersionIndex: 0,
          };

          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMessageId ? interruptedMsg : m))
          );
          api.saveMessage(interruptedMsg).catch((e) => console.error('Failed to save interrupted message:', e));
        } else {
          // No content arrived before network disconnect
          const errorMsg = `> ⚠️ **Network Interruption**: Connection dropped before receiving the response.\n\nClick **Resume Task** or **Regenerate** to continue executing this task without leaving the framework.`;
          const failedMsg: Message = {
            ...assistantMsg,
            content: errorMsg,
            is_interrupted: true,
            interrupted_reason: err.message || 'network_error',
          };
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMessageId ? failedMsg : m))
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
      buildSystemPrompt,
      loadConversations,
      setActiveConversationId,
    ]
  );

  // Resume an interrupted task seamlessly without restarting or leaving the framework
  const resumeTask = useCallback(
    async (targetMessageId?: string) => {
      if (isStreaming) return;

      const assistantMsgs = messages.filter((m) => m.role === 'assistant');
      const targetMsg = targetMessageId
        ? messages.find((m) => m.id === targetMessageId)
        : assistantMsgs[assistantMsgs.length - 1];

      if (!targetMsg || !targetMsg.content) return;

      const currentTaskState = analyzeTaskFrameworkState(messages, projectInstructions);
      const continuationPrompt = buildTaskContinuationPrompt(currentTaskState, targetMsg.content);

      const targetIndex = messages.findIndex((m) => m.id === targetMsg.id);
      const priorMessages = messages.slice(0, targetIndex);

      const convId = targetMsg.conversation_id || activeConversationId;
      if (!convId) return;

      const modelToUse = targetMsg.model_id || selectedModelId;
      setIsStreaming(true);
      setStreamingContent(targetMsg.content);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const baseSystemPrompt = buildSystemPrompt();
        const combinedSystemPrompt = `${baseSystemPrompt}\n\n---\n\n[TASK CONTINUATION PROTOCOL]: You are resuming an interrupted generation. Do not restart. Pick up immediately from the exact cutoff point and continue the task without leaving the active framework.`;

        // Send conversation history + partial response + resumption directive
        const contextPayload = [
          ...priorMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          {
            role: 'assistant',
            content: targetMsg.content.replace(/\n\n> ⚠️ \*\*Error\*\*[\s\S]*$/gi, '').trimEnd(),
          },
          {
            role: 'user',
            content: continuationPrompt,
          },
        ];

        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            modelId: modelToUse,
            messages: contextPayload,
            systemPrompt: combinedSystemPrompt,
          }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.body) throw new Error('No stream body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let continuationTokens = '';
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
                continuationTokens += parsed.content;
                setStreamingContent(mergeResumedContent(targetMsg.content, continuationTokens));
              }
            } catch (_) {}
          }
        }

        const mergedContent = mergeResumedContent(targetMsg.content, continuationTokens);

        const updatedMsg: Message = {
          ...targetMsg,
          content: mergedContent,
          is_interrupted: false,
          versions: [...(targetMsg.versions || []), mergedContent],
          activeVersionIndex: (targetMsg.versions?.length || 1),
        };

        setMessages((prev) => prev.map((m) => (m.id === targetMsg.id ? updatedMsg : m)));
        api.saveMessage(updatedMsg).catch((e) => console.error('Failed to save resumed message:', e));
      } catch (err: any) {
        console.error('Task resumption failed:', err);
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
        abortControllerRef.current = null;
      }
    },
    [isStreaming, messages, projectInstructions, buildSystemPrompt, activeConversationId, selectedModelId]
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

      let fullContent = '';
      try {
        const combinedSystemPrompt = buildSystemPrompt();

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
            systemPrompt: combinedSystemPrompt,
          }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const reader = response.body!.getReader();
        const decoder = new TextDecoder('utf-8');
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
                is_interrupted: false,
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
          if (fullContent && fullContent.trim().length > 0) {
            setMessages((prev) =>
              prev.map((m) => (m.id === messageId ? { ...m, is_interrupted: true, content: fullContent } : m))
            );
          }
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
        abortControllerRef.current = null;
      }
    },
    [messages, selectedModelId, buildSystemPrompt]
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
    if (activeProjectId && c.project_id !== activeProjectId) {
      return false;
    }
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
    refreshConversations: loadConversations,
  };
}
