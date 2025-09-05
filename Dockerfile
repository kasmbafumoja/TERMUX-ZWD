# TERMUX-MD Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json & install deps
COPY package*.json ./
RUN npm install --production

# Copy source
COPY . .

# Expose default port (optional)
EXPOSE 3000

# Run bot
CMD [ "node", "index.js" ]
