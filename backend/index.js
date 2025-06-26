const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const ytdl = require('yt-dlp-wrap');
const { transcribeAudio, synthesizeSpeech, synthesizeSynchronizedSpeech } = require('./services/translationService');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

// Configurer le chemin vers ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;

// Configuration pour la production
app.set('trust proxy', true); // Important pour Netlify
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Configuration CORS améliorée
app.use(cors({
  origin: ['https://globaltranscribe.netlify.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Ranges', 'Content-Range', 'Content-Length']
}));

app.use(express.json());

// Configuration de l'API YouTube
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
if (!YOUTUBE_API_KEY) {
  console.error('ERREUR: La variable d\'environnement YOUTUBE_API_KEY n\'est pas définie');
}

// Initialisation du client YouTube avec la clé API
const youtube = google.youtube({
  version: 'v3',
  auth: YOUTUBE_API_KEY,
  params: {
    key: YOUTUBE_API_KEY
  }
});
const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
const AWS_REGION = process.env.AWS_REGION;

// Créer le dossier downloads s'il n'existe pas
const downloadsDir = path.join(process.cwd(), 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

// Servir les fichiers statiques du dossier downloads avec configuration avancée
app.use('/downloads', (req, res, next) => {
  // Ajouter des en-têtes pour permettre la lecture en streaming
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  next();
}, express.static(downloadsDir, {
  setHeaders: (res, path) => {
    if (path.endsWith('.mp3') || path.endsWith('.mp4') || path.endsWith('.webm')) {
      res.setHeader('Content-Type', path.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4');
    }
  }
}));

// Route pour obtenir les détails d'une vidéo YouTube
app.get('/api/video-info', async (req, res) => {
  try {
    const { videoUrl } = req.query;
    if (!videoUrl) {
      return res.status(400).json({ error: 'URL de la vidéo manquante' });
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      return res.status(400).json({ error: 'ID de vidéo YouTube invalide' });
    }

    console.log('Tentative de récupération des informations pour la vidéo ID:', videoId);
    
    const response = await youtube.videos.list({
      part: 'snippet',
      id: videoId,
      maxResults: 1
    });

    if (!response.data.items || response.data.items.length === 0) {
      console.error('Aucune donnée trouvée pour la vidéo ID:', videoId);
      return res.status(404).json({ error: 'Vidéo non trouvée' });
    }

    console.log('Informations de la vidéo récupérées avec succès');
    res.json(response.data.items[0].snippet);
  } catch (error) {
    console.error('Erreur lors de la récupération des infos vidéo:', error);
    if (error.response) {
      console.error('Détails de l\'erreur API YouTube:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des informations de la vidéo',
      details: error.message 
    });
  }
});

// Route pour extraire l'audio d'une vidéo YouTube
app.get('/api/extract-audio', async (req, res) => {
  try {
    const { videoUrl } = req.query;
    if (!videoUrl) {
      return res.status(400).json({ error: 'URL de la vidéo manquante' });
    }

    const outputFileName = `${Date.now()}.mp3`;
    const outputPath = path.join(downloadsDir, outputFileName);

    await youtubedl(videoUrl, {
      extractAudio: true,
      audioFormat: 'mp3',
      output: outputPath
    });

    // Vérifier si le fichier existe
    if (!fs.existsSync(outputPath)) {
      throw new Error('Le fichier audio n\'a pas été créé');
    }

    // Renvoyer l'URL du fichier
    res.json({
      success: true,
      audioUrl: `/downloads/${outputFileName}`
    });
  } catch (error) {
    console.error('Erreur lors de l\'extraction audio:', error);
    res.status(500).json({ 
      error: "Une erreur est survenue lors de l'extraction audio.",
      details: error.message 
    });
  }
});

// Route pour traduire le texte
app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    // Implémentez la traduction ici avec Google Cloud Translation
    res.json({ translatedText: "Texte traduit" });
  } catch (error) {
    console.error('Erreur lors de la traduction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour traduire une vidéo
app.post('/api/translate-video', async (req, res) => {
  const requestId = Date.now();
  console.log(`[${requestId}] Début de la requête translate-video`);
  
  try {
    console.log(`[${requestId}] Body reçu:`, JSON.stringify(req.body, null, 2));
    
    const { videoUrl, targetLanguage } = req.body;
    
    if (!videoUrl || !targetLanguage) {
      const errorMsg = `[${requestId}] Paramètres manquants: ${JSON.stringify({ videoUrl, targetLanguage })}`;
      console.error(errorMsg);
      return res.status(400).json({ 
        error: "L'URL de la vidéo et la langue cible sont requises",
        requestId
      });
    }

    // Vérification des variables d'environnement requises
    const requiredEnvVars = ['YOUTUBE_API_KEY', 'AWS_ACCESS_KEY', 'AWS_SECRET_KEY', 'AWS_REGION'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      const errorMsg = `[${requestId}] Variables d'environnement manquantes: ${missingVars.join(', ')}`;
      console.error(errorMsg);
      return res.status(500).json({
        error: 'Configuration serveur incomplète',
        details: `Variables manquantes: ${missingVars.join(', ')}`,
        requestId
      });
    }

    const timestamp = Date.now();
    const videoFileName = `${timestamp}_video.mp4`;
    const videoPath = path.join(downloadsDir, videoFileName);
    const audioPath = path.join(downloadsDir, `${timestamp}_audio.mp3`);
    
    console.log(`[${requestId}] Chemins des fichiers:`, {
      videoPath,
      audioPath,
      downloadsDir,
      dirExists: fs.existsSync(downloadsDir)
    });
    
    // Créer le répertoire de téléchargement s'il n'existe pas
    if (!fs.existsSync(downloadsDir)) {
      console.log(`[${requestId}] Création du répertoire de téléchargement:`, downloadsDir);
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    try {
      console.log(`[${requestId}] Début du téléchargement de la vidéo...`);
      // 1. Télécharger la vidéo avec yt-dlp
      let videoDownloaded = false;
      let downloadError = null;
      
      console.log(`[${requestId}] Téléchargement de la vidéo depuis:`, videoUrl);
      
      try {
        // Télécharger d'abord la meilleure qualité disponible
        await ytdl.exec([
          videoUrl,
          '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
          '--output', videoPath,
          '--no-check-certificate',
          '--retries', '3',
          '--fragment-retries', '3',
          '--buffer-size', '16K',
          '--no-cache-dir',
          '--no-part',
          '--no-mtime',
          '--force-overwrites',
          '--no-playlist'
        ]);
        
      } catch (error) {
        console.error('Erreur lors du téléchargement:', error);
        downloadError = error;
      }
      
      // Vérifier si le fichier a été téléchargé
      if (fs.existsSync(videoPath)) {
        const stats = fs.statSync(videoPath);
        if (stats.size > 0) {
          videoDownloaded = true;
          console.log(`[${requestId}] Téléchargement réussi: ${stats.size} octets`);
        }
      }
      
      if (!videoDownloaded) {
        const errorMsg = `[${requestId}] Échec du téléchargement de la vidéo après plusieurs tentatives`;
        if (downloadError) {
          console.error(`${errorMsg}. Dernière erreur:`, downloadError);
        } else {
          console.error(errorMsg);
        }
        throw new Error('Impossible de télécharger la vidéo. Veuillez vérifier le lien et réessayer.');
      }

      console.log(`[${requestId}] Vérification du fichier vidéo téléchargé:`, videoPath);
      
      if (!fs.existsSync(videoPath)) {
        const errorMsg = `[${requestId}] Le fichier vidéo n'a pas été trouvé après le téléchargement`;
        console.error(errorMsg);
        throw new Error('Échec du téléchargement de la vidéo');
      }
      
      const stats = fs.statSync(videoPath);
      console.log(`[${requestId}] Taille du fichier vidéo: ${stats.size} octets`);
      
      if (stats.size === 0) {
        const errorMsg = `[${requestId}] Le fichier vidéo est vide`;
        console.error(errorMsg);
        throw new Error('La vidéo téléchargée est vide');
      }
      
      console.log(`[${requestId}] Vérification du fichier vidéo réussie`);

      console.log(`[${requestId}] Début de l'extraction audio...`);
      let audioExtracted = false;
      
      try {
        // Vérifier d'abord si la vidéo existe
        if (!fs.existsSync(videoPath)) {
          throw new Error('Le fichier vidéo est introuvable');
        }
        
        // Obtenir les informations sur la vidéo
        const videoStats = fs.statSync(videoPath);
        if (videoStats.size === 0) {
          throw new Error('Le fichier vidéo est vide');
        }
        
        console.log(`[${requestId}] Taille de la vidéo: ${(videoStats.size / (1024 * 1024)).toFixed(2)} Mo`);
        
        // Extraire l'audio avec FFmpeg
        await new Promise((resolve, reject) => {
          console.log(`[${requestId}] Démarrage de l'extraction audio avec FFmpeg...`);
          
          const command = ffmpeg(videoPath)
            .noVideo()
            .audioCodec('libmp3lame')
            .audioBitrate(128)
            .outputOptions([
              '-ar 44100',
              '-ac 2',
              '-q:a 2',
              '-y' // Écraser le fichier de sortie s'il existe
            ])
            .output(audioPath)
            .on('start', (commandLine) => {
              console.log(`[${requestId}] Commande FFmpeg: ${commandLine}`);
            })
            .on('progress', (progress) => {
              if (progress.percent) {
                console.log(`[${requestId}] Progression: ${Math.round(progress.percent)}%`);
              }
            })
            .on('end', () => {
              console.log(`[${requestId}] Extraction audio terminée avec succès`);
              resolve();
            })
            .on('error', (err, stdout, stderr) => {
              console.error(`[${requestId}] Erreur FFmpeg:`, err);
              console.error(`[${requestId}] Sortie standard:`, stdout);
              console.error(`[${requestId}] Sortie d'erreur:`, stderr);
              reject(new Error(`Échec de l'extraction audio: ${err.message}`));
            });
            
          command.run();
        });

        // Vérifier que le fichier audio a été créé
        if (!fs.existsSync(audioPath)) {
          throw new Error('Le fichier audio de sortie est introuvable');
        }
        
        const audioStats = fs.statSync(audioPath);
        if (audioStats.size === 0) {
          fs.unlinkSync(audioPath); // Supprimer le fichier vide
          throw new Error('Le fichier audio généré est vide');
        }
        
        audioExtracted = true;
        console.log(`[${requestId}] Fichier audio créé avec succès: ${(audioStats.size / (1024 * 1024)).toFixed(2)} Mo`);
        
      } catch (audioError) {
        console.error(`[${requestId}] Erreur lors de l'extraction audio:`, audioError);
        throw new Error(`Impossible d'extraire l'audio: ${audioError.message}`);
      }
      
      if (!audioExtracted) {
        console.error("Le fichier audio n'a pas été créé à:", audioPath);
        throw new Error("L'extraction de l'audio a échoué après plusieurs tentatives");
      }

      console.log('Début de la transcription avec timestamps...');
      // 3. Transcrire l'audio avec Whisper et obtenir les timestamps
      const transcriptionResult = await transcribeAudio(audioPath);
      if (!transcriptionResult || !transcriptionResult.text) {
        console.error("La transcription a retourné null ou undefined");
        throw new Error("La transcription a échoué");
      }
      console.log('=== DÉBUT TRANSCRIPTION ===');
      console.log(transcriptionResult.text);
      console.log('=== FIN TRANSCRIPTION ===');
      console.log(`Nombre de segments détectés: ${transcriptionResult.segments.length}`);

      console.log('Début de la synthèse vocale synchronisée...');
      // 4. Synthétiser la voix avec synchronisation
      const synchronizedResult = await synthesizeSynchronizedSpeech(transcriptionResult, targetLanguage);
      if (!synchronizedResult || !synchronizedResult.audioPath) {
        console.error("Le chemin de l'audio traduit est null ou undefined");
        throw new Error("La synthèse vocale synchronisée a échoué");
      }
      const translatedAudioPath = synchronizedResult.audioPath;
      console.log('Synthèse vocale synchronisée réussie:', translatedAudioPath);
      console.log(`Nombre de segments traduits et synchronisés: ${synchronizedResult.segments.length}`);

      // Obtenir le chemin relatif pour l'URL
      const relativeAudioPath = path.relative(path.join(__dirname, 'downloads'), translatedAudioPath);
      const audioUrl = `/downloads/${relativeAudioPath.replace(/\\/g, '/')}`;      
      console.log('URL audio finale:', audioUrl);
      
      // Obtenir le chemin relatif pour la vidéo
      const relativeVideoPath = path.relative(path.join(__dirname, 'downloads'), videoPath);
      const videoFileUrl = `/downloads/${relativeVideoPath.replace(/\\/g, '/')}`;      
      console.log('URL vidéo originale:', videoFileUrl);

      // 5. Envoyer les chemins des fichiers
      res.json({ 
        success: true,
        audioPath: audioUrl,
        videoPath: videoFileUrl,
        transcription: transcriptionResult.text
      });

    } catch (innerError) {
      console.error(`[${requestId}] Erreur lors du traitement de la vidéo:`, {
        message: innerError.message,
        stack: innerError.stack,
        code: innerError.code,
        path: innerError.path
      });
      
      // Nettoyage des fichiers temporaires en cas d'erreur
      try {
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
          console.log(`[${requestId}] Fichier vidéo temporaire supprimé:`, videoPath);
        }
        if (fs.existsSync(audioPath)) {
          fs.unlinkSync(audioPath);
          console.log(`[${requestId}] Fichier audio temporaire supprimé:`, audioPath);
        }
      } catch (cleanupError) {
        console.error(`[${requestId}] Erreur lors du nettoyage des fichiers temporaires:`, cleanupError);
      }
      
      throw {
        ...innerError,
        isOperational: true,
        requestId,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    const errorId = `err_${Date.now()}`;
    const errorDetails = {
      errorId,
      timestamp: new Date().toISOString(),
      message: error.message,
      code: error.code,
      requestId: error.requestId || 'unknown',
      isOperational: error.isOperational || false
    };

    // Journalisation détaillée en développement
    console.error(`[${errorId}] Erreur lors de la traduction de la vidéo:`, {
      ...errorDetails,
      stack: error.stack,
      request: {
        url: req.originalUrl,
        method: req.method,
        headers: req.headers,
        body: req.body
      }
    });

    // Réponse d'erreur adaptée
    const response = {
      success: false,
      error: "Une erreur est survenue lors du traitement de votre demande.",
      errorId,
      ...(error.isOperational ? { details: error.message } : {})
    };

    // En production, ne pas renvoyer les détails sensibles
    if (process.env.NODE_ENV === 'development') {
      response.stack = error.stack;
      response.fullError = error;
    }

    res.status(error.statusCode || 500).json(response);
  }
});

// Route pour fusionner l'audio traduit avec la vidéo originale
app.post('/api/merge-audio-video', async (req, res) => {
  try {
    console.log('Début de la requête merge-audio-video');
    console.log('Body reçu:', req.body);
    
    const { videoPath, audioPath } = req.body;
    
    if (!videoPath || !audioPath) {
      console.log('Paramètres manquants:', { videoPath, audioPath });
      return res.status(400).json({ 
        error: "Les chemins de la vidéo et de l'audio sont requis" 
      });
    }

    // Convertir les chemins relatifs en chemins absolus
    const absoluteVideoPath = path.join(__dirname, videoPath.replace(/^\/downloads\//, 'downloads/'));
    const absoluteAudioPath = path.join(__dirname, audioPath.replace(/^\/downloads\//, 'downloads/'));
    
    console.log('Chemin absolu vidéo:', absoluteVideoPath);
    console.log('Chemin absolu audio:', absoluteAudioPath);

    // Vérifier que les fichiers existent
    if (!fs.existsSync(absoluteVideoPath)) {
      throw new Error(`Le fichier vidéo n'existe pas: ${absoluteVideoPath}`);
    }
    if (!fs.existsSync(absoluteAudioPath)) {
      throw new Error(`Le fichier audio n'existe pas: ${absoluteAudioPath}`);
    }

    // Créer un nom de fichier pour la vidéo fusionnée
    const timestamp = Date.now();
    const mergedFileName = `${timestamp}_merged.mp4`;
    const mergedFilePath = path.join(downloadsDir, mergedFileName);
    
    console.log('Chemin du fichier fusionné:', mergedFilePath);

    // Utiliser FFmpeg pour fusionner l'audio et la vidéo
    const { exec } = require('child_process');
    
    const ffmpegCommand = `ffmpeg -i "${absoluteVideoPath}" -i "${absoluteAudioPath}" -map 0:v -map 1:a -c:v copy -c:a aac "${mergedFilePath}"`;
    
    console.log('Commande FFmpeg:', ffmpegCommand);
    
    exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('Erreur FFmpeg:', error);
        return res.status(500).json({ 
          error: "La fusion audio-vidéo a échoué",
          details: error.message 
        });
      }
      
      console.log('Fusion réussie');
      console.log('Sortie FFmpeg:', stdout);
      console.log('Erreurs FFmpeg:', stderr);
      
      // Obtenir le chemin relatif pour l'URL
      const relativePath = path.relative(path.join(__dirname, 'downloads'), mergedFilePath);
      const mergedUrl = `/downloads/${relativePath.replace(/\\/g, '/')}`;      
      console.log('URL vidéo fusionnée:', mergedUrl);
      
      res.json({ 
        success: true,
        mergedVideoPath: mergedUrl 
      });
    });
    
  } catch (error) {
    console.error('Erreur détaillée lors de la fusion audio-vidéo:', error);
    res.status(500).json({ 
      error: "Une erreur est survenue lors de la fusion audio-vidéo. Veuillez réessayer.",
      details: error.message,
      stack: error.stack
    });
  }
});

function extractVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});
