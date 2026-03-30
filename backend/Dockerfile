FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy source (including fixed prisma schema with all opposite relation fields)
COPY . .
RUN npx prisma generate
RUN npm run build

# NOTE: no npm prune -- prisma CLI must be available at runtime for migrations

EXPOSE 4000

# Container entrypoint: start.js runs `prisma migrate deploy` (then db push fallback) before requiring dist/app.js
CMD ["node", "start.js"]
