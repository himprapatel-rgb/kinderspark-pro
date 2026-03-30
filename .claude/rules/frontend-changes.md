---
paths:
  - "frontend/app/**"
  - "frontend/components/**"
  - "frontend/lib/**"
  - "frontend/store/**"
---
# Frontend Change Rule

When modifying frontend files:

1. **New page/route** → Update CLAUDE.md "File Structure" section
2. **New component** → Update CLAUDE.md "File Structure" if it's a core UI component
3. **New module in lib/modules.ts** → Update CLAUDE.md "Learning Modules"
4. **New API call in lib/api.ts** → Verify matching backend endpoint exists
5. **Store shape change** → Update CLAUDE.md state description
6. **Design system change** → Update CLAUDE.md "Frontend Design System"

Follow the design system: dark-first, glass morphism, mobile-first, emoji-heavy for children.
