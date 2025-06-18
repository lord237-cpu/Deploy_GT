# Global Transcribe

Une application React permettant de traduire des vidéos YouTube dans différentes langues.

## Fonctionnalités

- Intégration avec l'API YouTube pour la lecture de vidéos
- Traduction vocale d'une langue à une autre
- Génération de voix dans la langue cible
- Téléchargement des vidéos traduites
- Interface utilisateur moderne et intuitive

## Prérequis

- Node.js (version 14 ou supérieure)
- Un compte Google Cloud Platform avec les APIs suivantes activées :
  - YouTube Data API
  - Cloud Translation API
  - Cloud Text-to-Speech API

## Installation

1. Clonez ce dépôt
2. Installez les dépendances :
```bash
npm install
```

3. Créez un fichier `.env` à la racine du projet et ajoutez vos clés API :
```
REACT_APP_YOUTUBE_API_KEY=votre_clé_api_youtube
REACT_APP_GOOGLE_CLOUD_API_KEY=votre_clé_api_google_cloud
```

4. Démarrez l'application :
```bash
npm start
```

## Utilisation

1. Collez l'URL d'une vidéo YouTube dans le champ de saisie
2. Sélectionnez la langue cible dans le menu déroulant
3. Cliquez sur "Traduire" pour lancer le processus de traduction
4. Une fois la traduction terminée, vous pouvez :
   - Regarder la vidéo avec la nouvelle piste audio
   - Télécharger la vidéo traduite

## Technologies utilisées

- React
- React Player
- Google Cloud Translation
- Google Cloud Text-to-Speech
- YouTube Data API
- Styled Components
