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
        console.error('Session creation failed:', response.status, errorText);
        throw new Error(`Failed to create session: ${response.status}`);
      }
      
      const data = await response.json();
      return data.session_id;
    } catch (error) {
      console.error('Session creation error:', error);
      throw error;
    }
  }, []);

  // Update GPT config with new model
  const updateGPTConfig = useCallback(async (model: string) => {
    if (!sessionId || !gptConfig) {
      console.log('⚠️ Cannot update GPT config: missing sessionId or gptConfig');
      return;
    }

    try {
      console.log('🔄 Updating GPT config with new model:', model);
      
      const updatedConfig = {
        ...gptConfig,
        model: model
      };

      console.log('📤 Sending updated GPT config to backend:', updatedConfig);
      
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
      
      const configResponse = await fetch(`${backendUrl}/api/sessions/${sessionId}/gpt-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedConfig),
      });
      
      if (!configResponse.ok) {
        console.error('❌ Failed to update GPT config in backend:', configResponse.status);
        const errorText = await configResponse.text();
        console.error('Backend error details:', errorText);
      } else {
        console.log('✅ GPT config updated in backend successfully');
      }
    } catch (backendError) {
      console.error('❌ Backend connection failed for config update:', backendError);
    }
  }, [sessionId, gptConfig]);

  // Load GPT configuration and knowledge base
  const loadGPTKnowledgeBase = useCallback(async (gptId: string, sessionId: string) => {
    try {
      console.log('🔍 Fetching GPT configuration for ID:', gptId);
      const gptResponse = await fetch(`/api/gpts/${gptId}`);
      if (!gptResponse.ok) {
        console.error('❌ Failed to fetch GPT configuration:', gptResponse.status);
        const errorText = await gptResponse.text();
        console.error('Error details:', errorText);
        return;
      }
      
      const gpt = await gptResponse.json();
      console.log('📋 GPT Configuration loaded:', {
        id: gpt.id,
        name: gpt.name,
        model: gpt.model,
        hybridRag: gpt.hybridRag,
        hasKnowledgeBase: !!gpt.knowledgeBase,
        knowledgeBase: gpt.knowledgeBase
      });
      
      // Store hybridRag setting for use in chat
      setHybridRag(gpt.hybridRag || false);
      
      // Create GPT configuration object with the actual model from database
      // Convert frontend model format to backend model format
      const backendModelName = frontendToBackend(gpt.model);
      
      const gptConfigData = {
        model: backendModelName, // Use the backend model name
        webBrowser: gpt.webBrowser,
        hybridRag: gpt.hybridRag,
        mcp: gpt.mcp,
        instruction: gpt.instruction,
        name: gpt.name,
        description: gpt.description
      };

      console.log('🔄 Model conversion:', {
        frontendModel: gpt.model,
        backendModel: backendModelName
      });

      // Store the config for later updates
      setGptConfig(gptConfigData);

      console.log('📤 Sending GPT config to backend:', gptConfigData);
      
      // Check if backend is available
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
      
      try {
        // Set GPT config in session
        const configResponse = await fetch(`${backendUrl}/api/sessions/${sessionId}/gpt-config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gptConfigData),
        });
        
        if (!configResponse.ok) {
          console.error('❌ Failed to send GPT config to backend:', configResponse.status);
          const errorText = await configResponse.text();
          console.error('Backend error details:', errorText);
        } else {
          console.log('✅ GPT config sent to backend successfully');
        }
      } catch (backendError) {
        console.error('❌ Backend connection failed:', backendError);
        // Don't throw here, just log the error and continue
      }
      
      // Load knowledge base documents if they exist
      if (gpt.knowledgeBase) {
        const kbDocs = JSON.parse(gpt.knowledgeBase);
        console.log('📚 Knowledge Base URLs found:', kbDocs);
        
        const documentsPayload = {
          documents: kbDocs.map((url: string, index: number) => ({
            id: `kb-${index}`,
            filename: url.split('/').pop() || `kb-doc-${index}`,
            file_url: url,
            file_type: "application/pdf", // Default, backend will detect
            size: 0
          })),
          doc_type: "kb"
        };
        
        console.log('📤 Sending KB documents to backend:', documentsPayload);
        
        try {
          // Send KB documents to backend
          const kbResponse = await fetch(`${backendUrl}/api/sessions/${sessionId}/add-documents`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(documentsPayload),
          });
          
          if (!kbResponse.ok) {
            console.error('❌ Failed to send KB documents to backend:', kbResponse.status);
            const errorText = await kbResponse.text();
            console.error('Error details:', errorText);
          } else {
            console.log('✅ KB documents sent to backend successfully');
            const responseData = await kbResponse.json();
            console.log('Backend response:', responseData);
          }
        } catch (backendError) {
          console.error('❌ Backend connection failed for KB documents:', backendError);
          // Don't throw here, just log the error and continue
        }
      } else {
        console.log('ℹ️ No knowledge base configured for this GPT');
      }
    } catch (error) {
      console.error('❌ Failed to load GPT knowledge base:', error);
    }
  }, []);

  // Handle document upload from user
  const uploadDocument = useCallback(async (fileUrl: string, filename: string) => {
    if (!sessionId) {
      throw new Error('No session ID available');
    }

    try {
      console.log('📤 Uploading user document:', { fileUrl, filename });
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
        console.error('❌ Failed to upload user document:', response.status);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        throw new Error(`Failed to upload document: ${response.status}`);
      }

      console.log('✅ User document uploaded successfully!');
      const responseData = await response.json();
      console.log('Backend response:', responseData);
    } catch (error) {
      console.error('❌ Failed to add document to session:', error);
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
        
        console.log('🚀 Initializing chat session...');
        const newSessionId = await createSession();
        console.log('✅ Session created with ID:', newSessionId);
        
        if (isMounted) {
          setSessionId(newSessionId);
          
          // Load GPT configuration and knowledge base
          await loadGPTKnowledgeBase(gptId, newSessionId);
        }
      } catch (error) {
        if (isMounted) {
          console.error('❌ Error initializing session:', error);
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
