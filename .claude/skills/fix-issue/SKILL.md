---
name: fix-issue
description: Fix a GitHub issue end-to-end for KinderSpark Pro. Use when given a GitHub issue number or bug report to investigate, fix, test, and create a PR.
---

# Fix GitHub Issue — KinderSpark Pro

## Workflow

1. **Read the issue**
   ```bash
   gh issue view $ARGUMENTS
   ```

2. **Understand the problem**
   - Read the issue title, body, and any comments
   - Identify which part of the app is affected (child/teacher/parent/admin, frontend/backend)

3. **Find the relevant code**
   - For frontend bugs: check `frontend/app/` for the affected page
   - For backend bugs: check `backend/src/routes/` and `backend/src/controllers/`
   - For AI bugs: check `backend/src/services/ai/`
   - For DB bugs: check `backend/prisma/schema.prisma`

4. **Implement the fix**
   - Follow api-conventions skill for backend changes
   - Follow design-system skill for frontend changes
   - Never trust client-supplied IDs — use `req.user.id` from JWT
   - Always sanitize AI inputs

5. **Verify the fix**
   ```bash
   cd backend && npm run build   # verify TypeScript compiles
   ```

6. **Commit with clear message**
   ```bash
   git add <specific files>
   git commit -m "fix: <what was wrong and how it was fixed>"
   ```

7. **Push and create PR**
   ```bash
   git push -u origin <branch>
   gh pr create --title "fix: <issue summary>" --body "Fixes #$ARGUMENTS\n\n## What changed\n<description>"
   ```

## Branch Naming
```
fix/issue-<number>-<short-description>
```
Example: `fix/issue-42-tutor-stars-not-saving`

## Common Fix Patterns

### Stars not updating
```typescript
// PUT /api/students/:id
await prisma.student.update({
  where: { id: req.params.id },
  data: { stars: body.stars, streak: body.streak }
})
```

### AI response not showing
- Check `backend/src/services/ai/router.ts` — provider fallback chain
- Verify `ANTHROPIC_API_KEY` is set in Railway env vars
- Add fallback message if all providers fail

### Auth failing
- Check JWT secret matches between token generation and verification
- Verify `requireAuth` middleware is applied to the route
- Check token expiry in `RefreshToken` table
