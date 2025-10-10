"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { frontendToBackend } from '@/lib/modelMapping';

interface ChatSessionHook {
  sessionId: string | null;
  isInitializing: boolean;
  error: string | null;
  hybridRag: boolean;
  uploadDocument: (fileUrl: string, filename: string) => Promise<void>;
  loadGPTKnowledgeBase: (gptId: string) => Promise<void>;
  updateGPTConfig: (model: string) => Promise<void>;
}

export function useChatSession(): ChatSessionHook {
  const params = useParams();
  const gptId = params.id as string;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hybridRag, setHybridRag] = useState<boolean>(false);
  const [gptConfig, setGptConfig] = useState<any>(null);

  // Create session
  const createSession = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create session: ${response.status}`);
      }
      
      const data = await response.json();
      return data.session_id;
    } catch (error) {
      throw error;
    }
  }, []);

  // Update GPT config with new model
  const updateGPTConfig = useCallback(async (model: string) => {
    if (!sessionId || !gptConfig) {
      return;
    }

    try {
      const updatedConfig = {
        ...gptConfig,
        model: model
      };

      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
      
      const configResponse = await fetch(`${backendUrl}/api/sessions/${sessionId}/gpt-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedConfig),
      });
      
      if (!configResponse.ok) {
        const errorText = await configResponse.text();
      }
    } catch (backendError) {
      // Handle error silently
    }
  }, [sessionId, gptConfig]);

  // Load GPT configuration and knowledge base
  const loadGPTKnowledgeBase = useCallback(async (gptId: string, sessionId: string) => {
    try {
      const gptResponse = await fetch(`/api/gpts/${gptId}`);
      if (!gptResponse.ok) {
        const errorText = await gptResponse.text();
        return;
      }
      
      const gpt = await gptResponse.json();

      setHybridRag(gpt.hybridRag || false);

      const backendModelName = frontendToBackend(gpt.model);
      
      const gptConfigData = {
        model: backendModelName, 
        webBrowser: gpt.webBrowser,
        hybridRag: gpt.hybridRag,
        mcp: gpt.mcp,
        instruction: gpt.instruction,
        name: gpt.name,
        description: gpt.description
      };

      setGptConfig(gptConfigData);

      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
      
      try {
        const configResponse = await fetch(`${backendUrl}/api/sessions/${sessionId}/gpt-config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gptConfigData),
        });
        
        if (!configResponse.ok) {
          const errorText = await configResponse.text();
        }
      } catch (backendError) {
        // Handle error silently
      }
      
      if (gpt.knowledgeBase) {
        const kbDocs = JSON.parse(gpt.knowledgeBase);
        
        const documentsPayload = {
          documents: kbDocs.map((url: string, index: number) => ({
            id: `kb-${index}`,
            filename: url.split('/').pop() || `kb-doc-${index}`,
            file_url: url,
            file_type: "application/pdf", 
            size: 0
          })),
          doc_type: "kb"
        };
        
        try {
          const kbResponse = await fetch(`${backendUrl}/api/sessions/${sessionId}/add-documents`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(documentsPayload),
          });
          
          if (!kbResponse.ok) {
            const errorText = await kbResponse.text();
          } else {
            const responseData = await kbResponse.json();
          }
        } catch (backendError) {
          // Don't throw here, just log the error and continue
        }
      }
    } catch (error) {
      // Handle error silently
    }
  }, []);

  // Handle document upload from user
  const uploadDocument = useCallback(async (fileUrl: string, filename: string) => {
    if (!sessionId) {
      throw new Error('No session ID available');
    }

    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
      
      // Send user document to backend
      const response = await fetch(`${backendUrl}/api/sessions/${sessionId}/add-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents: [{
            id: Date.now().toString(),
            filename: filename,
            file_url: fileUrl,
            file_type: "application/pdf", // Backend will detect actual type
            size: 0
          }],
          doc_type: "user"
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload document: ${response.status}`);
      }

      const responseData = await response.json();
    } catch (error) {
      throw error;
    }
  }, [sessionId]);

  // Initialize session and load GPT knowledge base
  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      try {
        setIsInitializing(true);
        setError(null);
        
        const newSessionId = await createSession();
        
        if (isMounted) {
          setSessionId(newSessionId);
          
          // Load GPT configuration and knowledge base
          await loadGPTKnowledgeBase(gptId, newSessionId);
        }
      } catch (error) {
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'Failed to initialize session');
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    if (!sessionId) {
      initializeSession();
    }

    return () => {
      isMounted = false;
    };
  }, [gptId, createSession, loadGPTKnowledgeBase, sessionId]);

  return {
    sessionId,
    isInitializing,
    error,
    hybridRag,
    uploadDocument,
    loadGPTKnowledgeBase: (gptId: string) => loadGPTKnowledgeBase(gptId, sessionId!),
    updateGPTConfig,
  };
}
