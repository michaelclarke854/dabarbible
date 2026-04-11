---
name: Bible version translations
description: Available Bible versions via bible-api.com — KJV, WEB, ASV, BBE, DRA, YLT (all public domain)
type: feature
---
## Available Versions (bible-api.com)
- KJV — King James Version (default)
- WEB — World English Bible
- ASV — American Standard Version (1901)
- BBE — Bible in Basic English
- DRA — Douay-Rheims 1899 American Edition
- YLT — Young's Literal Translation (NT only)

## Important
NIV, ESV, AMP, MSG, NLT are copyrighted and NOT available on bible-api.com.
Never add these to the version list — they will always fail.

## Architecture
- Edge function `bible-proxy` proxies requests to bible-api.com
- Returns 200 with `{text: null}` on upstream errors (graceful degradation)
- Version pills: ScriptureVersionPills component, used on Response cards, History cards, Scripture tab
- Profile default stored in `profiles.preferred_bible_version`
