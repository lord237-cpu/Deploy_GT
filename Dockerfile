# Étape de construction
FROM node:18-slim AS builder

# Installer les dépendances système nécessaires
RUN apt-get update && \
    apt-get install -y python3-pip && \
    pip3 install -U yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --production

# Copier les fichiers de l'application
COPY . .

# Étape d'exécution
FROM node:18-slim

# Installer FFmpeg et autres dépendances système
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copier les fichiers nécessaires depuis l'étape de construction
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server ./server

# Créer un utilisateur non-root
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=10000

# Exposer le port
EXPOSE 10000

# Commande de démarrage
CMD ["node", "server/index.js"]
