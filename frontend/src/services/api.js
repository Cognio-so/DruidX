import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const createSession = async () => {
  const response = await api.post('/sessions')
  return response.data
}

export const getSession = async (sessionId) => {
  const response = await api.get(`/sessions/${sessionId}`)
  return response.data
}

export const setGPTConfig = async (sessionId, config) => {
  const response = await api.post(`/sessions/${sessionId}/gpt-config`, config)
  return response.data
}

export const uploadDocuments = async (sessionId, files, docType = 'user') => {
  const formData = new FormData()
  files.forEach(file => {
    formData.append('files', file)
  })
  formData.append('doc_type', docType)

  const response = await api.post(`/sessions/${sessionId}/upload-documents`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const getDocuments = async (sessionId) => {
  const response = await api.get(`/sessions/${sessionId}/documents`)
  return response.data
}

export const sendMessage = async (sessionId, message, webSearch = false, rag = false, deepSearch = false, uploadedDoc = false) => {
  const response = await api.post(`/sessions/${sessionId}/chat`, {
    message,
    web_search: webSearch,
    rag: rag,
    deep_search: deepSearch,
    uploaded_doc: uploadedDoc
  })
  return response.data
}

export const deleteSession = async (sessionId) => {
  const response = await api.delete(`/sessions/${sessionId}`)
  return response.data
}

export const healthCheck = async () => {
  const response = await api.get('/health')
  return response.data
}
