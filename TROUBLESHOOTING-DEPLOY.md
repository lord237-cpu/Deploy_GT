# Guide de Dépannage - Déploiement GlobalTranscribe

## Problème : ffmpeg-static version non trouvée

### Solution 1 : Version corrigée
J'ai corrigé le `package.json` du backend avec `ffmpeg-static@^5.1.0` au lieu de `^5.2.1`.

### Solution 2 : Déploiement par étapes
1. **Premier déploiement minimal** :
   ```bash
   # Renommer le package.json actuel
   mv package.json package-full.json
   # Utiliser la version simple
   mv package-simple.json package.json
   # Déployer
   git add . && git commit -m "Simple deploy" && git push
   ```

2. **Ajouter les dépendances graduellement** après le premier déploiement réussi.

### Solution 3 : Variables d'environnement Render
Assurez-vous de configurer ces variables dans Render :
- `NODE_ENV=production`
- `NODE_VERSION=18` (dans les Build Settings)

### Solution 4 : Build Command alternative
Dans Render, utilisez comme Build Command :
```
npm ci --only=production
```

## Autres problèmes courants

### Port Configuration
Render utilise le port dynamique via `process.env.PORT`. Vérifiez que votre `index.js` contient :
```javascript
const PORT = process.env.PORT || 5000;
```

### CORS Configuration
Pour connecter le frontend au backend déployé, mettez à jour le CORS dans `index.js` :
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'https://votre-frontend.netlify.app'],
  credentials: true
}));
```

### Variables d'environnement
Configurez toutes les variables du fichier `.env.example` dans les settings Render.

## Alternative de déploiement

Si Render continue à poser problème, essayez **Railway** :
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Ou **Heroku** :
```bash
heroku create your-app-name
git push heroku main
```
