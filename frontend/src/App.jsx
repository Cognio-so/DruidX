import React, { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import GPTBuilder from './components/GPTBuilder'
import ChatInterface from './components/ChatInterface'
import { createSession } from './services/api'

function App() {
  const [currentView, setCurrentView] = useState('builder') // 'builder' or 'chat'
  const [sessionId, setSessionId] = useState(null)
  const [gptConfig, setGptConfig] = useState(null)

  useEffect(() => {
    // Create a session when the app loads
    const initSession = async () => {
      try {
        const session = await createSession()
        setSessionId(session.session_id)
      } catch (error) {
        console.error('Failed to create session:', error)
      }
    }
    initSession()
  }, [])

  const handleGPTCreated = (config) => {
    setGptConfig(config)
    setCurrentView('chat')
  }

  return (
    <div className="container">
      <Toaster position="top-right" />
      
      <header className="card" style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ 
          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: '2.5rem',
          fontWeight: 'bold',
          margin: 0
        }}>
          🧙‍♂️ DruidX AI Assistant
        </h1>
        <p style={{ color: '#6c757d', marginTop: '8px' }}>
          Build and chat with your custom GPTs
        </p>
      </header>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <button
          className={`btn ${currentView === 'builder' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setCurrentView('builder')}
        >
          🔧 GPT Builder
        </button>
        <button
          className={`btn ${currentView === 'chat' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setCurrentView('chat')}
          disabled={!gptConfig}
        >
          💬 Start Chat
        </button>
      </div>

      {currentView === 'builder' && (
        <GPTBuilder 
          sessionId={sessionId}
          onGPTCreated={handleGPTCreated}
        />
      )}

      {currentView === 'chat' && gptConfig && (
        <ChatInterface 
          sessionId={sessionId}
          gptConfig={gptConfig}
        />
      )}
    </div>
  )
}

export default App
