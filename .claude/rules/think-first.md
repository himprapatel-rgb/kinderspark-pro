# Think First — Research, Propose, Then Act

## The Golden Rule

**NEVER write code before doing these 3 steps:**

### Step 1 — Research (always)
Before touching any file, understand the full context:
- Read the relevant existing files
- Check how similar things are done elsewhere in the codebase
- Understand what will break if you change something
- Look at the Prisma schema if data is involved
- Check `frontend/lib/api.ts` if an API call is involved

### Step 2 — Propose (for anything non-trivial)
For any change beyond a single obvious fix, state your plan first:
```
PLAN:
- What I found in the codebase
- What I propose to do (option A / option B if relevant)
- Files I will change
- Any risks or side effects
```
Then wait for approval before writing code.

### Step 3 — Implement (after approval)
Only after the user confirms:
- Make the changes
- Verify the build still works
- Update CLAUDE.md if a core area changed

## What Counts as "Non-Trivial"
- Any new file creation
- Any database schema change
- Any new API endpoint
- Any change affecting more than 2 files
- Any change to auth, security, or middleware
- Any new dependency

## What Can Be Done Immediately
- Fixing a typo or obvious bug in 1 file
- Updating a UI label or copy
- Adding a CSS class or style tweak
- Updating CLAUDE.md itself

## Why This Matters
Rushing into code without understanding the codebase leads to:
- Duplicate logic (service already exists)
- Breaking existing patterns
- Missed security checks
- Inconsistent design
- Wasted effort fixing collisions

Think like a senior engineer: read first, plan second, code third.
