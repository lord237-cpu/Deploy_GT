# GlobalTranscribe Backend

API backend Express.js pour l'application de transcription et traduction vidéo GlobalTranscribe.

## Installation

```bash
npm install
```

## Configuration

1. Copiez le fichier `.env.example` vers `.env`
2. Remplissez les variables d'environnement nécessaires (voir .env.example)

## Développement

```bash
npm run dev
```

Le serveur sera accessible sur http://localhost:5000

## Production

```bash
npm start
```

## Endpoints API

- `POST /api/extract-audio` - Extraction audio depuis URL YouTube
- `POST /api/transcribe` - Transcription audio vers texte
- `POST /api/translate` - Traduction de texte
- `POST /api/synthesize` - Synthèse vocale
- `GET /api/video-details` - Détails vidéo YouTube

## Dépendances principales

- Express 4.21.2
- Google Cloud Speech API 7.0.1
- Google Cloud Text-to-Speech 4.0.0
- Google Cloud Translate 7.0.0
- OpenAI 4.80.1
- FFmpeg (via ffmpeg-static et fluent-ffmpeg)
- YouTube-DL 3.0.20

## Structure

```
.
├── index.js           # Serveur Express principal
├── services/          # Services (traduction, etc.)
├── downloads/         # Fichiers téléchargés temporaires
├── .env.example       # Variables d'environnement exemple
└── package.json       # Dépendances et scripts
```

## Déploiement

Le backend peut être déployé sur :
- Heroku (Procfile inclus)
- Render
- Railway
- Vercel
- Netlify Functions

Assurez-vous de configurer toutes les variables d'environnement sur votre plateforme de déploiement.
