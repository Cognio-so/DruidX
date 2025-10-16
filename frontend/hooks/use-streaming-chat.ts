import { useState, useCallback, useRef } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  imageUrls?: string[];
}

interface ChatRequest {
  message: string;
  web_search?: boolean;
  rag?: boolean;
  deep_search?: boolean;
  uploaded_doc?: boolean;
  model?: string;
}

interface StreamingChatHook {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (request: ChatRequest) => Promise<void>;
  clearMessages: () => void;
}

export function useStreamingChat(sessionId: string): StreamingChatHook {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (request: ChatRequest) => {
    if (!sessionId) {
      setError('Session ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: request.message,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Create assistant message placeholder
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const requestBody = {
        sessionId,
        ...request,
      };

      // Route to appropriate endpoint based on deep_search flag
      const endpoint = request.deep_search ? '/api/deepresearch/stream' : '/api/chat/stream';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content' && data.data) {
                const { content, full_response, is_complete, img_urls } = data.data;
                
                // Debug logging to see what we're receiving
                console.log('Streaming data received:', { content, full_response, is_complete, img_urls });
                
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? {
                        ...msg,
                        content: full_response || content || '',
                        imageUrls: img_urls || msg.imageUrls, // Preserve existing if not in update
                        isStreaming: !is_complete,
                      }
                    : msg
                ));
              } else if (data.type === 'error') {
                setError(data.data.error || 'An error occurred');
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? {
                        ...msg,
                        content: 'Sorry, an error occurred while processing your request.',
                        isStreaming: false,
                      }
                    : msg
                ));
              } else if (data.type === 'done') {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? {
                        ...msg,
                        isStreaming: false,
                      }
                    : msg
                ));
              }
            } catch (parseError) {
              // Handle parse error silently
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? {
                ...msg,
                content: 'Sorry, an error occurred while processing your request.',
                isStreaming: false,
              }
            : msg
        ));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [sessionId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}
