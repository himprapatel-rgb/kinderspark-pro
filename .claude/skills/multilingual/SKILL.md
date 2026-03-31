---
name: multilingual
description: KinderSpark Pro multilingual translation system. Use when adding new UI strings, adding a new language, fixing translations, or syncing web/iOS/Android translation files.
---

# KinderSpark Multilingual System

## Architecture — Single Source of Truth
```
translations/master.json          ← ONLY edit this file
        ↓  node translations/sync.js
frontend/lib/i18n.ts              ← Web (auto-generated)
translations/ios/*/Localizable.strings  ← iOS (auto-generated)
translations/android/*/strings.xml      ← Android (auto-generated)
```
**Never edit platform files directly** — always edit master.json and run sync.

## Supported Languages (10)
| Code | Language | Direction | Flag |
|------|----------|-----------|------|
| en | English | LTR | 🇬🇧 |
| fr | Français | LTR | 🇫🇷 |
| es | Español | LTR | 🇪🇸 |
| ar | العربية | **RTL** | 🇸🇦 |
| ur | اردو | **RTL** | 🇵🇰 |
| hi | हिन्दी | LTR | 🇮🇳 |
| zh | 中文 | LTR | 🇨🇳 |
| pt | Português | LTR | 🇧🇷 |
| de | Deutsch | LTR | 🇩🇪 |
| tr | Türkçe | LTR | 🇹🇷 |

## Adding a New Translation Key
1. Add to `translations/master.json` under `keys`:
```json
"section.newKey": {
  "en": "English text",
  "fr": "Texte français",
  "es": "Texto español",
  "ar": "النص العربي",
  "ur": "اردو متن",
  "hi": "हिंदी पाठ",
  "zh": "中文文本",
  "pt": "Texto português",
  "de": "Deutscher Text",
  "tr": "Türkçe metin"
}
```
2. Run: `node translations/sync.js`
3. Use in code: `t('section.newKey', locale)`

## Key Naming Convention
```
section.descriptiveName
```
Examples: `nav.home`, `tutor.correct`, `common.save`, `child.goodMorning`

## Using Translations in Next.js
```tsx
import { t } from '@/lib/i18n'
import { useAppStore } from '@/store/appStore'

const { settings } = useAppStore()
const locale = settings.lang as Locale

return <button>{t('common.save', locale)}</button>
```

## RTL Support (Arabic + Urdu)
The layout must apply `dir="rtl"` for RTL languages:
```tsx
// frontend/app/layout.tsx or child/layout.tsx
const isRTL = ['ar', 'ur'].includes(settings.lang)
<html dir={isRTL ? 'rtl' : 'ltr'}>
```

## Adding a New Language
1. Add language code to `_meta.languages` in master.json
2. Add to `_meta.rtlLanguages` if RTL
3. Translate all keys (use Claude for this)
4. Update sync.js names/flags map
5. Run `node translations/sync.js`
6. Update language selector in `frontend/app/child/settings/page.tsx`

## Running the Sync
```bash
node translations/sync.js           # sync all platforms
node translations/sync.js --check  # check for missing translations
node translations/sync.js --lang fr # only French output
```

## Auto-Sync via GitHub Actions
Push changes to `translations/master.json` → workflow triggers automatically.
Or manually trigger: Actions → "Multilingual AI Agent" → Run workflow.
The agent will: fill missing translations → sync all platforms → update DB → commit.
