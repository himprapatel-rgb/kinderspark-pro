# Ship — Push to GitHub & Deploy to Railway

Commit all pending changes, push to GitHub, merge to `main`, and trigger Railway deployment.

## Steps

### 1. Check for a GitHub PAT in git remote

```bash
git remote get-url origin
```

If the remote does NOT contain a token (i.e. it still uses the local proxy `127.0.0.1`), reconfigure it:

```bash
# Ask the user for their GitHub PAT if not already set
echo "Remote is proxied — checking for GITHUB_TOKEN env var..."
if [ -z "$GITHUB_TOKEN" ]; then
  echo "⚠️  No GITHUB_TOKEN found. Please set it:"
  echo "   export GITHUB_TOKEN=ghp_your_token_here"
  echo "   Then re-run /ship"
  exit 1
fi
git remote set-url origin https://$GITHUB_TOKEN@github.com/himprapatel-rgb/kinderspark-pro.git
echo "✅ Remote updated with token"
```

### 2. Stage and commit all pending changes

Check for uncommitted work:

```bash
git status --short
```

If there are changes, stage and commit them:

```bash
git add -A
git commit -m "chore: ship latest changes"
```

If the working tree is already clean, skip the commit.

### 3. Push current branch to GitHub

```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push -u origin "$CURRENT_BRANCH"
echo "✅ Pushed branch: $CURRENT_BRANCH"
```

### 4. Merge to `main`

```bash
git fetch origin main
git checkout main
git pull origin main
git merge "$CURRENT_BRANCH" --no-ff -m "feat: merge $CURRENT_BRANCH into main"
git push origin main
echo "✅ Merged and pushed to main"
```

If there are merge conflicts, resolve them by preferring the incoming branch (`$CURRENT_BRANCH`) for all application code, then commit and push.

### 5. Confirm Railway deploy triggered

Railway auto-deploys on every push to `main` via GitHub integration. Verify:

```bash
echo ""
echo "🚂 Railway deploy triggered for: himprapatel-rgb/kinderspark-pro"
echo ""
echo "Monitor at: https://railway.app/dashboard"
echo ""
echo "Services deploying:"
echo "  • kinderspark-backend  (backend/) — runs: npx prisma migrate deploy && node dist/app.js"
echo "  • kinderspark-frontend (frontend/) — runs: next build && next start"
echo ""
echo "Health checks:"
echo "  Backend:  GET /health → {\"status\":\"ok\"}"
echo "  Frontend: GET /"
```

### 6. Switch back to working branch

```bash
git checkout "$CURRENT_BRANCH"
echo "✅ Back on branch: $CURRENT_BRANCH"
```

## Usage

```bash
# One-time setup — set your GitHub PAT:
export GITHUB_TOKEN=ghp_your_token_here

# Then run this command any time you want to ship:
/ship
```

To make the token permanent, add it to your shell profile:

```bash
echo 'export GITHUB_TOKEN=ghp_your_token_here' >> ~/.bashrc
```

## Done ✓

Your code is live. Check Railway dashboard for deploy status and logs.
