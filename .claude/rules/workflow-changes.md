---
paths:
  - ".github/workflows/**"
---
# Workflow / Agent Change Rule

When adding or modifying GitHub Actions workflows:

1. **New agent workflow** → Update CLAUDE.md "Agent System" section
2. **New trigger** → Update AGENT.md trigger table
3. **New secret required** → Update CLAUDE.md "Environment Variables" → GitHub Secrets
4. **Changed schedule** → Update AGENT.md agent roster table

All agent workflows must use `ANTHROPIC_API_KEY` from GitHub secrets.
Never hardcode API keys in workflow files.
