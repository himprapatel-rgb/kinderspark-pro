FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# NOTE: no npm prune -- prisma CLI must be available at runtime for migrations

EXPOSE 4000

CMD sh -c "npx prisma migrate deploy; echo '==> dist contents:'; ls -la dist/; echo '==> Starting node...'; node dist/app.js 2>&1; echo '==> Node exited with code:' $?"
