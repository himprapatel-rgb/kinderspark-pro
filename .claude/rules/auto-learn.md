# Auto-Learn Rule — Keep CLAUDE.md Updated

## When to Update CLAUDE.md

After completing ANY of these actions, you MUST update `/CLAUDE.md`:

1. **New database model or field** — Update "Database Models" section
2. **New API route or endpoint** — Update "API Conventions" section
3. **New frontend page or route** — Update "File Structure" section
4. **New service or controller** — Update "File Structure" section
5. **New environment variable** — Update "Environment Variables" section
6. **New learning module** — Update "Learning Modules" section
7. **New GitHub Actions workflow** — Update "Agent System" section
8. **Bug fix for a Known Gap** — Remove it from "Known Gaps"
9. **New dependency or tech** — Update "Tech Stack" section
10. **Security change** — Update "Security Rules" section
11. **Design system change** — Update "Frontend Design System" section

## How to Update

- Keep entries concise (1-2 lines each)
- Use the same formatting style already in the file
- Update the "Known Gaps" date when modifying that section
- If a feature is completed that was listed as a gap, remove it from gaps
- Never remove existing rules — only add or modify

## Why This Matters

CLAUDE.md is loaded at the start of every session. If it's outdated, Claude
starts with wrong assumptions. Keeping it current means every session starts
with perfect project understanding — no re-learning needed.
