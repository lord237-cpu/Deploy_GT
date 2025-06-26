// Configuration de l'API backend
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  extractAudio: '/api/extract-audio',
  transcribe: '/api/transcribe',
  translate: '/api/translate',
  synthesize: '/api/synthesize',
  videoDetails: '/api/video-details'
};

export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`;
