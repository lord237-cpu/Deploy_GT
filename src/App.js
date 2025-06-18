import React, { useState } from 'react';
import styled from 'styled-components';
import ReactPlayer from 'react-player';
import axios from 'axios';
import { useTheme } from './contexts/ThemeContext';
import { lightTheme, darkTheme } from './styles/themes';

const API_URL = 'http://localhost:5000/api';
const BASE_URL = 'http://localhost:5000';

const languages = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh', name: '中文' },
];

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  min-height: 100vh;
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  transition: all 0.3s ease;
`;

const Title = styled.h1`
  color: ${(props) => props.theme.text};
`;

const Subtitle = styled.p`
  color: ${(props) => props.theme.text};
  margin-bottom: 2rem;
`;

const InputContainer = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
  background-color: ${(props) => props.theme.secondary};
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Input = styled.input`
  padding: 0.8rem;
  width: 400px;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 4px;
  font-size: 1rem;
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
`;

const Select = styled.select`
  padding: 0.8rem;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 4px;
  font-size: 1rem;
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
`;

const Button = styled.button`
  padding: 0.8rem 2rem;
  background-color: ${(props) => props.theme.primary};
  color: ${(props) => props.theme.text};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
  margin-right: 10px;

  &:hover {
    background-color: ${(props) => props.theme.primaryHover};
  }
`;

const PlayerContainer = styled.div`
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  background: #333;
  border-radius: 8px;
  overflow: hidden;
`;

const Controls = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  background: #222;
`;

const ControlButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1.5rem;
  padding: 0.5rem;

  &:hover {
    opacity: 0.8;
  }
`;

const ThemeToggle = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 10px;
  background-color: transparent;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 4px;
  cursor: pointer;
  color: ${(props) => props.theme.text};
`;

function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('fr');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState('');
  const [translatedVideoUrl, setTranslatedVideoUrl] = useState('');
  const { isDarkMode, toggleTheme } = useTheme();

  const theme = isDarkMode ? darkTheme : lightTheme;

  const handleTranslate = async () => {
    if (!videoUrl) {
      alert('Veuillez entrer une URL YouTube valide');
      return;
    }

    setIsTranslating(true);
    try {
      // 1. Obtenir les informations de la vidéo
      setTranslationProgress('Récupération des détails de la vidéo...');
      await axios.get(`${API_URL}/video-info`, {
        params: { videoUrl }
      });

      // 2. Extraire l'audio et traduire la vidéo
      setTranslationProgress('Extraction et traduction en cours...');
      const response = await axios.post(`${API_URL}/translate-video`, {
        videoUrl,
        targetLanguage
      });

      if (response.data.success) {
        // Récupérer les chemins de l'audio traduit et de la vidéo originale
        const audioPath = response.data.audioPath;
        const videoPath = response.data.videoPath;
        
        console.log('Chemin audio traduit:', audioPath);
        console.log('Chemin vidéo originale:', videoPath);
        
        // 3. Fusionner l'audio traduit avec la vidéo originale
        setTranslationProgress('Fusion de l\'audio traduit avec la vidéo originale...');
        const mergeResponse = await axios.post(`${API_URL}/merge-audio-video`, {
          audioPath,
          videoPath
        });
        
        if (mergeResponse.data.success) {
          // Construire l'URL complète pour la vidéo traduite
          const mergedVideoUrl = `${BASE_URL}${mergeResponse.data.mergedVideoPath}`;
          console.log('URL vidéo traduite:', mergedVideoUrl);
          setTranslatedVideoUrl(mergedVideoUrl);
          alert('Traduction terminée !');
        } else {
          throw new Error(mergeResponse.data.error || 'Erreur lors de la fusion audio-vidéo');
        }
      } else {
        throw new Error(response.data.error || 'Erreur lors de la traduction');
      }
    } catch (error) {
      console.error('Erreur lors de la traduction:', error);
      alert(error.response?.data?.error || 'Une erreur est survenue lors de la traduction. Veuillez réessayer.');
    } finally {
      setIsTranslating(false);
      setTranslationProgress('');
    }
  };

  const handleDownload = () => {
    if (translatedVideoUrl) {
      const link = document.createElement('a');
      link.href = translatedVideoUrl;
      link.download = 'video_traduite.mp3';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('Veuillez d\'abord traduire une vidéo');
    }
  };

  return (
    <Container theme={theme}>
      <ThemeToggle onClick={toggleTheme}>
        {isDarkMode ? '☀️ Mode Jour' : '🌙 Mode Nuit'}
      </ThemeToggle>

      <Title>Global Transcribe</Title>
      <Subtitle>Traduisez vos vidéos d'une langue à une autre</Subtitle>

      <InputContainer theme={theme}>
        <Input
          type="text"
          placeholder="Collez le lien de votre vidéo Youtube"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          theme={theme}
        />
        <Select
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
          theme={theme}
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </Select>
        <Button onClick={handleTranslate} theme={theme}>
          {isTranslating ? 'Traduction en cours...' : 'Traduire'}
        </Button>
      </InputContainer>

      <PlayerContainer>
        <ReactPlayer
          url={translatedVideoUrl || videoUrl}
          width="100%"
          height="400px"
          playing={isPlaying}
          volume={volume}
          controls={true}
          config={{
            file: {
              forceAudio: translatedVideoUrl && translatedVideoUrl.includes('.mp3'),
              attributes: {
                controlsList: 'nodownload',
                crossOrigin: 'anonymous'
              }
            }
          }}
          onError={(e) => {
            console.error('Erreur de lecture:', e);
            // Tentative de rechargement en cas d'erreur
            setTranslatedVideoUrl(prev => prev + '?reload=' + Date.now());
          }}
          onReady={() => console.log('Lecteur vidéo prêt')}
          stopOnUnmount={false}
        />
        {isTranslating && (
          <div style={{ padding: '1rem', color: theme.text, background: 'rgba(0,0,0,0.7)' }}>
            {translationProgress}
          </div>
        )}
        <Controls>
          <ControlButton onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? '⏸' : '▶'}
          </ControlButton>
          <ControlButton onClick={() => setVolume(volume === 0 ? 1 : 0)}>
            {volume === 0 ? '🔇' : '🔊'}
          </ControlButton>
          <ControlButton onClick={handleDownload}>⬇️</ControlButton>
        </Controls>
      </PlayerContainer>
    </Container>
  );
}

export default App;
