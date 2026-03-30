# Session Start — Learn Recent Changes

At the START of every session, before doing any work:

1. **Read CLAUDE.md** — This is your project memory. Understand the full project.

2. **Check recent changes** — Run:
   ```
   git log --oneline -10
   ```
   Scan the last 10 commits to understand what changed recently.

3. **If commits touch core files, verify CLAUDE.md is current:**
   - `schema.prisma` changed → check "Database Models" is up to date
   - New files in `routes/` → check "API Conventions" has them
   - New files in `frontend/app/` → check "File Structure" has them
   - New `.yml` in `.github/workflows/` → check "Agent System" has them

4. **If CLAUDE.md is outdated, update it FIRST** before doing any other work.

This ensures Claude never works with stale project knowledge.
