FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --production

EXPOSE 4000
CMD sh -c "npx prisma migrate resolve --rolled-back 20260321_add_stars_reward_and_last_login 2>/dev/null || true; npx prisma migrate deploy 2>/dev/null || true; node dist/app.js"
