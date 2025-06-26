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

## 🚨 Problème Actuel : Packages inexistants

### Versions problématiques détectées :
- ❌ `ffmpeg-static@^5.2.1` → ✅ Corrigé vers `^5.1.0`
- ❌ `yt-dlp-wrap@^2.10.8` → ✅ Corrigé vers `^2.10.0`
- ❌ Node.js 18 (EOL) → ✅ Mis à jour vers Node.js 20 LTS

## 🎯 Solution Recommandée : Déploiement Par Étapes

### Étape 1 : Déploiement Minimal (RECOMMANDÉ)
Pour garantir que le déploiement fonctionne d'abord :

```bash
# Dans le dossier backend
cd backend
cp package-minimal.json package.json
cp index-minimal.js index.js
git add .
git commit -m "Deploy minimal backend for testing"
git push
```

### Étape 2 : Test du déploiement minimal
- ✅ Vérifiez que `https://votre-app.onrender.com/` affiche le message JSON
- ✅ Testez `https://votre-app.onrender.com/health`

### Étape 3 : Déploiement Complet (après succès minimal)
Une fois le déploiement minimal réussi :

```bash
# Restaurer les fichiers complets
cp package.json package-full.json  # sauvegarder
cp package-minimal.json package.json  # si vous voulez garder minimal
# OU utiliser le package.json corrigé que j'ai mis à jour
git add .
git commit -m "Add full functionality"
git push
```

## 🔧 Autres Solutions

### Solution A : Versions Ultra-Conservatrices
Si les problèmes persistent, utilisez ces versions testées :

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  }
}
```

### Solution B : Alternative à yt-dlp-wrap
Remplacez `yt-dlp-wrap` par `youtube-dl-exec` seulement :

```json
{
  "dependencies": {
    "youtube-dl-exec": "^2.3.0"
  }
}
```

### Solution C : Configuration Render Personnalisée
Dans Render Dashboard > Settings :

1. **Build Command** : `npm ci --legacy-peer-deps`
2. **Node Version** : `20.10.0`
3. **Environment Variables** :
   ```
   NODE_ENV=production
   NPM_CONFIG_LEGACY_PEER_DEPS=true
   ```

## 🚀 Alternatives de Déploiement

### Railway (Plus Permissif)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Heroku
```bash
heroku create globaltranscribe-backend
git push heroku main
```

### Vercel (Serverless)
```bash
npm install -g vercel
vercel --prod
```

## ⚙️ Configuration Post-Déploiement

### Variables d'environnement Render
```env
NODE_ENV=production
PORT=10000
# Ajoutez vos clés API ici
GOOGLE_CLOUD_PROJECT_ID=your-project
OPENAI_API_KEY=your-key
```

### CORS pour Frontend
Une fois déployé, mettez à jour l'URL backend dans le frontend :
```env
REACT_APP_API_URL=https://votre-backend.onrender.com
```

## 📋 Checklist de Déploiement

- [ ] Node.js 20 configuré (`.nvmrc`)
- [ ] Versions de packages corrigées
- [ ] Variables d'environnement configurées
- [ ] Test de l'endpoint `/health`
- [ ] Frontend connecté au backend
- [ ] Tests des API endpoints

## 🆘 Si Tout Échoue

**Utilisez le déploiement minimal** avec `package-minimal.json` et `index-minimal.js` :
- ✅ Garantit un déploiement qui fonctionne
- ✅ Vous pourrez ajouter les fonctionnalités progressivement
- ✅ Permet de tester la configuration Render
