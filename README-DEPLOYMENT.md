# GlobalTranscribe - Guide de Déploiement

## Nouvelle Structure

Le projet a été réorganisé pour faciliter le déploiement en séparant clairement le frontend et le backend :

```
GlobalTranscribe/
├── frontend/           # Application React
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── netlify.toml
│   └── README.md
├── backend/            # API Express.js
│   ├── index.js
│   ├── services/
│   ├── package.json
│   ├── Procfile
│   ├── render.yaml
│   └── README.md
└── README-DEPLOYMENT.md
```

## Déploiement Frontend

### Option 1: Netlify
1. Connectez votre repository GitHub/GitLab
2. Définissez le répertoire de build : `frontend`
3. Commande de build : `npm run build`
4. Répertoire de publication : `frontend/build`
5. Configurez les variables d'environnement :
   - `REACT_APP_API_URL` : URL de votre backend déployé
   - `REACT_APP_YOUTUBE_API_KEY` : Votre clé API YouTube

### Option 2: Vercel
```bash
cd frontend
npm install -g vercel
vercel --prod
```

## Déploiement Backend

### Option 1: Render
1. Connectez votre repository
2. Sélectionnez le répertoire `backend`
3. Configurez toutes les variables d'environnement depuis `.env.example`

### Option 2: Heroku
```bash
cd backend
heroku create your-app-name
git init
git add .
git commit -m "Initial commit"
heroku git:remote -a your-app-name
git push heroku main
```

### Option 3: Railway
```bash
cd backend
railway login
railway init
railway up
```

## Variables d'Environnement Requises

### Frontend (.env)
- `REACT_APP_API_URL` : URL du backend
- `REACT_APP_YOUTUBE_API_KEY` : Clé API YouTube

### Backend (.env)
Voir `backend/.env.example` pour la liste complète

## Développement Local

### Démarrer le Backend
```bash
cd backend
npm install
npm run dev
```

### Démarrer le Frontend
```bash
cd frontend
npm install
npm start
```

## Notes Importantes

1. **CORS** : Le backend est configuré pour accepter les requêtes du frontend
2. **Variables d'environnement** : Assurez-vous de configurer toutes les clés API
3. **Chemins** : Tous les chemins d'accès ont été mis à jour pour la nouvelle structure
4. **Dépendances** : Chaque partie a ses propres dépendances dans son `package.json`
