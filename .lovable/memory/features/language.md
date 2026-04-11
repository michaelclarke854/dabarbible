---
name: Language architecture
description: Multilingual preparation — language selector, waitlist, edge function params for scripture versions
type: feature
---
## Language Selector
- Globe icon in top bar (authenticated users only)
- Available: English (en)
- Coming soon (greyed): Español (es), Português (pt), 한국어 (ko), Français (fr)
- Coming-soon tap → waitlist modal captures email + language_code

## DB
- `profiles.language_preference` — defaults to 'en'
- `language_waitlist` — email + language_code, public insert

## Edge Function (seek-wisdom)
- Accepts `language` (default 'en') and `scriptureVersion` (default 'KJV')
- SCRIPTURE_VERSIONS map ready for: KJV, RV1960 (Spanish), ARA (Portuguese)
- LANGUAGE_INSTRUCTIONS map for response language
- Architecture swaps scripture version instruction in system prompt without rebuild
