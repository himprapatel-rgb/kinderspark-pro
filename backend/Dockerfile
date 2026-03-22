FROM node:20-alpine
WORKDIR /app

# Install all deps (including dev) for build
COPY package*.json ./
RUN npm ci

# Copy source and generate prisma + build
COPY . .
RUN npx prisma generate
RUN npm run build

# Remove dev deps after build
RUN npm prune --production

EXPOSE 4000
CMD npx prisma migrate deploy && node dist/app.js
