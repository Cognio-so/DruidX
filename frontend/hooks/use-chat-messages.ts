"use client";

import { useCallback } from 'react';
import { useStreamingChat } from './use-streaming-chat';

interface ChatMessagesHook {
  messages: any[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string, options?: {
    web_search?: boolean;
    rag?: boolean;
    deep_search?: boolean;
    uploaded_doc?: boolean;
  }) => Promise<void>;
  clearMessages: () => void;
}

export function useChatMessages(sessionId: string | null): ChatMessagesHook {
  const { messages, isLoading, error, sendMessage, clearMessages } = useStreamingChat(sessionId || '');

  const handleSendMessage = useCallback(async (message: string, options: {
    web_search?: boolean;
    rag?: boolean;
    deep_search?: boolean;
    uploaded_doc?: boolean;
  } = {}) => {
    if (!sessionId) {
      console.error('No session ID available');
      return;
    }

    await sendMessage({
      message,
      ...options,
    });
  }, [sessionId, sendMessage]);

  return {
    messages,
    isLoading,
    error,
    sendMessage: handleSendMessage,
    clearMessages,
  };
}
