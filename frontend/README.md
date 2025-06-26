# GlobalTranscribe Frontend

Interface utilisateur React pour l'application de transcription et traduction vidéo GlobalTranscribe.

## Installation

```bash
npm install
```

## Configuration

1. Copiez le fichier `.env.example` vers `.env`
2. Remplissez les variables d'environnement nécessaires :
   - `REACT_APP_API_URL` : URL de l'API backend (par défaut: http://localhost:5000)
   - `REACT_APP_YOUTUBE_API_KEY` : Clé API YouTube

## Développement

```bash
npm start
```

L'application sera accessible sur http://localhost:3000

## Build pour production

```bash
npm run build
```

## Dépendances principales

- React 18.2.0
- Styled Components 6.1.0
- Axios 1.6.0
- React Player 2.13.0

## Structure

```
src/
├── components/     # Composants React
├── contexts/       # Contextes React (ThemeContext)
├── services/       # Services API
├── config/         # Configuration (URLs API)
├── styles/         # Thèmes et styles
└── App.js          # Composant principal
```
