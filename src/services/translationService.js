import { TranslationServiceClient } from '@google-cloud/translate';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const translationClient = new TranslationServiceClient();
const textToSpeechClient = new TextToSpeechClient();

export const translationService = {
  async translateText(text, targetLanguage) {
    try {
      const projectId = process.env.REACT_APP_GOOGLE_CLOUD_PROJECT_ID;
      const location = 'global';

      const request = {
        parent: `projects/${projectId}/locations/${location}`,
        contents: [text],
        mimeType: 'text/plain',
        sourceLanguageCode: 'auto',
        targetLanguageCode: targetLanguage,
      };

      const [response] = await translationClient.translateText(request);
      return response.translations[0].translatedText;
    } catch (error) {
      console.error('Erreur de traduction:', error);
      throw error;
    }
  },

  async textToSpeech(text, languageCode) {
    try {
      const request = {
        input: { text },
        voice: {
          languageCode,
          ssmlGender: 'NEUTRAL',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          pitch: 0,
          speakingRate: 1,
        },
      };

      const [response] = await textToSpeechClient.synthesizeSpeech(request);
      return response.audioContent;
    } catch (error) {
      console.error('Erreur de synthèse vocale:', error);
      throw error;
    }
  }
};
