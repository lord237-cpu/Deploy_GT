import axios from 'axios';
import { getApiUrl, API_ENDPOINTS } from '../config/api';

export const translationService = {
  async translateText(text, targetLanguage) {
    try {
      const response = await axios.post(getApiUrl(API_ENDPOINTS.translate), {
        text,
        targetLanguage
      });
      
      return response.data.translatedText;
    } catch (error) {
      console.error('Erreur lors de la traduction:', error);
      throw new Error('Impossible de traduire le texte');
    }
  },

  async transcribeAudio(audioUrl) {
    try {
      const response = await axios.post(getApiUrl(API_ENDPOINTS.transcribe), {
        audioUrl
      });
      
      return response.data.transcription;
    } catch (error) {
      console.error('Erreur lors de la transcription:', error);
      throw new Error('Impossible de transcrire l\'audio');
    }
  },

  async synthesizeText(text, targetLanguage) {
    try {
      const response = await axios.post(getApiUrl(API_ENDPOINTS.synthesize), {
        text,
        targetLanguage
      });
      
      return response.data.audioUrl;
    } catch (error) {
      console.error('Erreur lors de la synthèse:', error);
      throw new Error('Impossible de synthétiser l\'audio');
    }
  }
};
