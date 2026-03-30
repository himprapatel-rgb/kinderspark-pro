FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY . .
RUN npm run build
RUN mkdir -p public

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Railway sets PORT; do not hardcode here (avoids EXPOSE / proxy mismatch).
# Next standalone binds via HOSTNAME — platform may inject HOSTNAME=container id,
# which breaks edge routing; force all interfaces at start.
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
# Ensure we bind 0.0.0.0 even if the platform sets HOSTNAME to the container name.
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]
