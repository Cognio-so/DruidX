"use client";

import { useEffect, useRef, useCallback } from "react";
import { saveConversation, ConversationData } from "@/app/admin/history/action";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface UseAutoSaveConversationProps {
  gptId: string;
  gptName: string;
  sessionId: string | null;
  messages: Message[];
}

export function useAutoSaveConversation({
  gptId,
  gptName,
  sessionId,
  messages
}: UseAutoSaveConversationProps) {
  const lastSavedCountRef = useRef(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const generateTitle = useCallback((gptName: string) => {
    const now = new Date();
    const month = now.toLocaleDateString('en-US', { month: 'short' });
    const day = now.getDate();
    const time = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    return `${gptName} - ${month} ${day}, ${time}`;
  }, []);

  const saveConversationData = useCallback(async () => {
    if (!sessionId || messages.length === 0) return;

    // Only save if we have both user and assistant messages
    const hasUserMessages = messages.some(msg => msg.role === 'user');
    const hasAssistantMessages = messages.some(msg => msg.role === 'assistant');
    
    if (!hasUserMessages || !hasAssistantMessages) return;

    // Check if there are any streaming messages
    const hasStreamingMessages = messages.some(msg => msg.isStreaming);
    if (hasStreamingMessages) return;

    try {
      const conversationData: ConversationData = {
        title: generateTitle(gptName),
        gptId,
        sessionId,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        }))
      };

      await saveConversation(conversationData);
      lastSavedCountRef.current = messages.length;
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [sessionId, messages, gptId, gptName, generateTitle]);

  useEffect(() => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only proceed if we have a session and messages
    if (!sessionId || messages.length === 0) return;

    // Check if we have new messages since last save
    if (messages.length <= lastSavedCountRef.current) return;

    // Check if the last message is from assistant and not streaming
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'assistant' && !lastMessage.isStreaming) {
      // Debounce the save operation by 1 second
      saveTimeoutRef.current = setTimeout(() => {
        saveConversationData();
      }, 1000);
    }

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [messages, sessionId, saveConversationData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
}
