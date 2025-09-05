# Utiliser Node.js 18 (stable avec Baileys)
FROM node:18

# Créer un répertoire pour l'app
WORKDIR /usr/src/app

# Copier package.json et package-lock.json en premier (meilleure cache Docker)
COPY package*.json ./

# Installer toutes les dépendances (évite --production à cause de Baileys)
RUN npm install --legacy-peer-deps

# Copier tout le projet dans le container
COPY . .

# Créer le dossier session (important pour stocker les credentials WhatsApp)
RUN mkdir -p /usr/src/app/session

# Exposer un port (Render exige un port même si le bot n'utilise pas de serveur HTTP)
EXPOSE 3000

# Lancer le bot
CMD ["node", "index.js"]
