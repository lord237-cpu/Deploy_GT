import axios from 'axios';
import { getApiUrl, API_ENDPOINTS } from '../config/api';

const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const youtubeService = {
  async getVideoDetails(videoUrl) {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) throw new Error('URL YouTube invalide');

    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
      params: {
        part: 'snippet',
        id: videoId,
        key: YOUTUBE_API_KEY
      }
    });

    return response.data.items[0].snippet;
  },

  async getAudioStream(videoUrl) {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) throw new Error('URL YouTube invalide');
    
    // Utiliser le backend pour extraire l'audio
    const response = await axios.post(getApiUrl(API_ENDPOINTS.extractAudio), {
      videoUrl,
      videoId
    });
    
    return response.data.audioUrl;
  }
};

function extractVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}
