import React, { useState, useRef, useEffect } from 'react'
import { Send, Plus, FileText, Search, Globe } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { sendMessage, uploadDocuments } from '../services/api'

function ChatInterface({ sessionId, gptConfig }) {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const onDrop = async (acceptedFiles) => {
    try {
      const result = await uploadDocuments(sessionId, acceptedFiles, 'user')
      toast.success(`Uploaded ${result.documents.length} documents`)
      setShowFileUpload(false)
    } catch (error) {
      toast.error('Failed to upload documents')
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    }
  })

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = { role: 'user', content: inputMessage }
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await sendMessage(sessionId, inputMessage, webSearchEnabled)
      setMessages(prev => [...prev, { role: 'assistant', content: response.message }])
    } catch (error) {
      toast.error('Failed to send message')
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.98)',
        borderRadius: '16px',
        padding: '24px',
        backdropFilter: 'blur(10px)'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '2px solid #e2e8f0'
        }}>
          <div>
            <h2 style={{ 
              margin: 0, 
              color: '#2d3748',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              {gptConfig.name}
            </h2>
            <p style={{ 
              margin: '4px 0 0 0', 
              color: '#4a5568', 
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {gptConfig.description}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Web Search Toggle */}
            <button
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              style={{
                background: webSearchEnabled 
                  ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)'
                  : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)',
                color: webSearchEnabled ? 'white' : '#4a5568',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: webSearchEnabled 
                  ? '0 4px 12px rgba(72, 187, 120, 0.3)'
                  : '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                if (webSearchEnabled) {
                  e.target.style.boxShadow = '0 6px 16px rgba(72, 187, 120, 0.4)'
                } else {
                  e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                if (webSearchEnabled) {
                  e.target.style.boxShadow = '0 4px 12px rgba(72, 187, 120, 0.3)'
                } else {
                  e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                }
              }}
            >
              <Globe size={16} />
              {webSearchEnabled ? 'Web Search ON' : 'Web Search OFF'}
            </button>
            
            {/* Add Documents Button */}
            <button
              onClick={() => setShowFileUpload(!showFileUpload)}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }}
            >
              <Plus size={16} />
              Add Documents
            </button>
          </div>
        </div>

        {/* File Upload */}
        {showFileUpload && (
          <div
            {...getRootProps()}
            style={{
              border: `2px dashed ${isDragActive ? '#667eea' : '#cbd5e0'}`,
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: isDragActive ? 'rgba(102, 126, 234, 0.05)' : '#f8fafc',
              marginBottom: '20px'
            }}
          >
            <input {...getInputProps()} />
            <FileText size={32} style={{ marginBottom: '12px', color: '#667eea' }} />
            <p style={{ margin: '8px 0', color: '#2d3748', fontWeight: '500' }}>
              Drag & drop files here, or click to select
            </p>
            <p style={{ fontSize: '12px', color: '#718096' }}>
              PDF, DOCX, TXT files
            </p>
          </div>
        )}

        {/* Messages */}
        <div style={{ 
          height: '400px', 
          overflowY: 'auto', 
          marginBottom: '20px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          {messages.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#4a5568',
              padding: '40px 20px'
            }}>
              <h3 style={{ color: '#2d3748', marginBottom: '8px' }}>Start a conversation!</h3>
              <p style={{ color: '#718096' }}>Ask questions or upload documents to get started.</p>
              {webSearchEnabled && (
                <p style={{ 
                  color: '#48bb78', 
                  fontSize: '14px', 
                  fontWeight: '500',
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <Globe size={16} />
                  Web search is enabled
                </p>
              )}
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  margin: '12px 0',
                  maxWidth: '80%',
                  background: message.role === 'user' ? '#667eea' : '#ffffff',
                  color: message.role === 'user' ? 'white' : '#2d3748',
                  marginLeft: message.role === 'user' ? 'auto' : '0',
                  marginRight: message.role === 'user' ? '0' : 'auto',
                  borderBottomRightRadius: message.role === 'user' ? '4px' : '12px',
                  borderBottomLeftRadius: message.role === 'user' ? '12px' : '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: message.role === 'assistant' ? '1px solid #e2e8f0' : 'none'
                }}
              >
                <div style={{ 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  fontSize: '14px',
                  opacity: 0.9,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {message.role === 'user' ? 'You' : gptConfig.name}
                  {message.role === 'user' && webSearchEnabled && (
                    <Globe size={12} style={{ opacity: 0.7 }} />
                  )}
                </div>
                <div style={{ 
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.5',
                  fontSize: '15px'
                }}>
                  {message.content}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              margin: '12px 0',
              maxWidth: '80%',
              background: '#ffffff',
              color: '#2d3748',
              marginRight: 'auto',
              borderBottomLeftRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ 
                fontWeight: '600', 
                marginBottom: '8px',
                fontSize: '14px',
                color: '#4a5568',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {gptConfig.name}
                {webSearchEnabled && <Globe size={12} />}
              </div>
              <div style={{ color: '#667eea', fontStyle: 'italic' }}>
                {webSearchEnabled ? 'Searching the web and thinking...' : 'Thinking...'}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <textarea
            style={{
              flex: 1,
              padding: '14px 16px',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '16px',
              background: '#ffffff',
              color: '#2d3748',
              transition: 'all 0.2s ease',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              minHeight: '50px',
              maxHeight: '120px'
            }}
            placeholder={webSearchEnabled ? "Type your message (web search enabled)..." : "Type your message..."}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={(e) => {
              e.target.style.borderColor = '#667eea'
              e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0'
              e.target.style.boxShadow = 'none'
            }}
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            style={{
              padding: '14px 20px',
              background: !inputMessage.trim() || isLoading
                ? 'linear-gradient(135deg, #a0aec0 0%, #718096 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: !inputMessage.trim() || isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              alignSelf: 'flex-end'
            }}
            onMouseEnter={(e) => {
              if (inputMessage.trim() && !isLoading) {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)'
              }
            }}
            onMouseLeave={(e) => {
              if (inputMessage.trim() && !isLoading) {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
              }
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface
