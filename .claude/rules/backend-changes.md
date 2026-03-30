---
paths:
  - "backend/prisma/schema.prisma"
  - "backend/src/routes/**"
  - "backend/src/controllers/**"
  - "backend/src/services/**"
  - "backend/src/middleware/**"
---
# Backend Change Rule

When modifying backend files:

1. **New Prisma model/field** → Update CLAUDE.md "Database Models" section
2. **New route file** → Update CLAUDE.md "API Conventions" and "File Structure"
3. **New controller** → Update CLAUDE.md "File Structure"
4. **New service** → Update CLAUDE.md "File Structure"
5. **New middleware** → Update CLAUDE.md "File Structure"
6. **Changed auth flow** → Update CLAUDE.md "Security Rules"

Always run `cd backend && npm run build` after TypeScript changes to verify compilation.
