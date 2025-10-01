import React, { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadDocuments, setGPTConfig } from '../services/api'

function GPTBuilder({ sessionId, onGPTCreated }) {
  const [config, setConfig] = useState({
    name: '',
    description: '',
    model: 'gpt-4o',
    system_prompt: '',
    temperature: 0.7
  })
  const [uploadedDocs, setUploadedDocs] = useState([])
  const [isCreating, setIsCreating] = useState(false)

  const onDropDocs = async (acceptedFiles) => {
    try {
      const result = await uploadDocuments(sessionId, acceptedFiles, 'kb')
      setUploadedDocs(prev => [...prev, ...result.documents])
      toast.success(`Uploaded ${result.documents.length} documents`)
    } catch (error) {
      toast.error('Failed to upload documents')
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropDocs,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/json': ['.json']
    }
  })

  const removeDoc = (docId) => {
    setUploadedDocs(prev => prev.filter(doc => doc.id !== docId))
  }

  const handleCreateGPT = async () => {
    if (!config.name || !config.description || !config.system_prompt) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsCreating(true)
    try {
      await setGPTConfig(sessionId, config)
      onGPTCreated(config)
      toast.success('GPT created successfully!')
    } catch (error) {
      toast.error('Failed to create GPT')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '20px',
      padding: '32px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.98)',
        borderRadius: '16px',
        padding: '32px',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '50px',
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '16px'
          }}>
            <Sparkles size={20} />
            Create Your Custom GPT
          </div>
          <p style={{ color: '#4a5568', fontSize: '14px' }}>
            Configure your AI assistant with custom knowledge and behavior
          </p>
        </div>
        
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* GPT Name */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600',
              color: '#2d3748',
              fontSize: '14px'
            }}>
              GPT Name *
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '16px',
                background: '#ffffff',
                color: '#2d3748',
                transition: 'all 0.2s ease',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder="My Custom GPT"
              value={config.name}
              onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea'
                e.target.style.background = '#ffffff'
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0'
                e.target.style.background = '#ffffff'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600',
              color: '#2d3748',
              fontSize: '14px'
            }}>
              Description *
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '16px',
                background: '#ffffff',
                color: '#2d3748',
                transition: 'all 0.2s ease',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder="A helpful assistant for..."
              value={config.description}
              onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea'
                e.target.style.background = '#ffffff'
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0'
                e.target.style.background = '#ffffff'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Model Selection */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600',
              color: '#2d3748',
              fontSize: '14px'
            }}>
              Model
            </label>
            <select
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '16px',
                background: '#ffffff',
                color: '#2d3748',
                transition: 'all 0.2s ease',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
              value={config.model}
              onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea'
                e.target.style.background = '#ffffff'
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0'
                e.target.style.background = '#ffffff'
                e.target.style.boxShadow = 'none'
              }}
            >
              <option value="gpt-4o" style={{ color: '#2d3748' }}>GPT-4o</option>
              <option value="gpt-4o-mini" style={{ color: '#2d3748' }}>GPT-4o Mini</option>
              <option value="gpt-3.5-turbo" style={{ color: '#2d3748' }}>GPT-3.5 Turbo</option>
            </select>
          </div>

          {/* System Prompt - ONLY ONE PROMPT BOX */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600',
              color: '#2d3748',
              fontSize: '14px'
            }}>
              System Prompt *
            </label>
            <textarea
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '16px',
                background: '#ffffff',
                color: '#2d3748',
                transition: 'all 0.2s ease',
                outline: 'none',
                resize: 'vertical',
                minHeight: '120px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
              placeholder="You are a helpful assistant that..."
              value={config.system_prompt}
              onChange={(e) => setConfig(prev => ({ ...prev, system_prompt: e.target.value }))}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea'
                e.target.style.background = '#ffffff'
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0'
                e.target.style.background = '#ffffff'
                e.target.style.boxShadow = 'none'
              }}
              rows={4}
            />
          </div>

          {/* Temperature */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600',
              color: '#2d3748',
              fontSize: '14px'
            }}>
              Temperature: {config.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.temperature}
              onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              style={{ 
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                background: 'linear-gradient(to right, #667eea 0%, #764ba2 100%)',
                outline: 'none',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                appearance: 'none'
              }}
            />
            <style jsx>{`
              input[type="range"]::-webkit-slider-thumb {
                appearance: none;
                height: 20px;
                width: 20px;
                border-radius: 50%;
                background: #667eea;
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
              }
              input[type="range"]::-moz-range-thumb {
                height: 20px;
                width: 20px;
                border-radius: 50%;
                background: #667eea;
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
              }
            `}</style>
          </div>

          {/* Knowledge Base Upload */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600',
              color: '#2d3748',
              fontSize: '14px'
            }}>
              Knowledge Base (Optional)
            </label>
            <div
              {...getRootProps()}
              style={{
                border: `2px dashed ${isDragActive ? '#667eea' : '#cbd5e0'}`,
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isDragActive ? 'rgba(102, 126, 234, 0.05)' : '#f8fafc'
              }}
            >
              <input {...getInputProps()} />
              <Upload size={32} style={{ marginBottom: '12px', color: '#667eea' }} />
              <p style={{ margin: '8px 0', color: '#4a5568', fontWeight: '500' }}>
                Drag & drop files here, or click to select
              </p>
              <p style={{ fontSize: '12px', color: '#718096' }}>
                PDF, DOCX, TXT, JSON files
              </p>
            </div>
            
            {uploadedDocs.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ 
                  marginBottom: '12px', 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: '#2d3748'
                }}>
                  Uploaded Documents ({uploadedDocs.length})
                </h4>
                {uploadedDocs.map(doc => (
                  <div key={doc.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <FileText size={18} color="#667eea" />
                      <span style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                        {doc.filename}
                      </span>
                    </div>
                    <button
                      onClick={() => removeDoc(doc.id)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#fed7d7'}
                      onMouseLeave={(e) => e.target.style.background = 'none'}
                    >
                      <X size={16} color="#e53e3e" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateGPT}
            disabled={isCreating}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: isCreating 
                ? 'linear-gradient(135deg, #a0aec0 0%, #718096 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (!isCreating) {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isCreating) {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
              }
            }}
          >
            {isCreating ? 'Creating GPT...' : '✨ Create GPT'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default GPTBuilder