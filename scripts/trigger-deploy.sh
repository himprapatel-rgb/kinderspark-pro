#!/usr/bin/env bash
# =============================================================
# Trigger GitHub Actions deployment via GitHub API
# Needs: GITHUB_TOKEN env var set
# Usage: GITHUB_TOKEN=ghp_xxx bash scripts/trigger-deploy.sh
# =============================================================
set -e
REPO="himprapatel-rgb/kinderspark-pro"
WORKFLOW="deploy.yml"
BRANCH="main"

[ -z "$GITHUB_TOKEN" ] && echo "❌ Set GITHUB_TOKEN env var first" && exit 1

echo "🚀 Triggering deployment workflow on GitHub Actions..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/$REPO/actions/workflows/$WORKFLOW/dispatches" \
  -d "{\"ref\":\"$BRANCH\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" = "204" ]; then
  echo "✅ Workflow triggered successfully!"
  echo "👉 Watch it here: https://github.com/$REPO/actions"
else
  echo "❌ Failed (HTTP $HTTP_CODE): $BODY"
fi

echo ""
echo "📊 Checking recent workflow runs..."
curl -s \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO/actions/runs?per_page=3" \
  | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    (d.workflow_runs||[]).forEach(r => {
      console.log(\`  \${r.status === 'completed' ? (r.conclusion === 'success' ? '✅' : '❌') : '🔄'} \${r.name} — \${r.status} — \${r.head_commit?.message?.split('\n')[0]?.slice(0,50)}\`);
    });
  " 2>/dev/null || echo "  (install node to see run details)"
