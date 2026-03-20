# KinderSpark Pro

AI-powered kindergarten learning platform with Next.js frontend, Express backend, and PostgreSQL database.

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Zustand
- **Backend**: Node.js, Express, Prisma ORM
- **Database**: PostgreSQL
- **AI**: Claude API
- **Auth**: Clerk
- **Deploy**: Vercel (frontend), Railway (backend)

## Getting Started

```bash
# Install dependencies
cd frontend && npm install
cd ../backend && npm install

# Start database
docker-compose up db -d

# Run migrations
cd backend && npm run prisma:migrate

# Start dev servers
cd frontend && npm run dev
cd backend && npm run dev
```
