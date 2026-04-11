---
name: Dark sacred design tokens
description: Full dark color system with gold accents, Cinzel/Lato fonts, sacred animations
type: design
---

## Color Palette (Dark Sacred)

| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| background | 40 29% 5% | #12100A | Page background |
| card | 40 27% 9% | #1C1810 | Card / surface |
| scripture-card | 40 25% 8% | #1A1510 | Scripture card bg |
| foreground | 38 42% 85% | #E8DCC8 | Primary text |
| muted-foreground | 38 23% 56% | #A89878 | Secondary text |
| gold | 38 55% 50% | #C4973A | Gold accent, buttons |
| gold-light | 38 62% 58% | #D4A853 | Threshold question highlight |
| gold-dark | 38 50% 38% | — | Hover state |
| primary-foreground | 36 20% 5% | #0F0D0A | Button text on gold |
| input | 38 27% 11% | #221E14 | Input background |
| border | 38 55% 50% / 0.15 | — | Dividers (gold at ~15%) |
| nav | 40 30% 4% | #0D0B07 | Bottom nav bar |

## Scripture Card Treatment
- Background: `bg-scripture-card` (#1A1510)
- Left border: 4px solid gold (#C4973A)
- Reference: gold Cinzel uppercase
- Verse text: #E8DCC8 Playfair italic

## Threshold Question
- Color: `text-gold-light` (#D4A853) — brighter than citations
- Font: Playfair Display italic

## Fonts
- Headings: Cinzel (serif)
- Body: Lato (sans-serif)
- Verse text: Playfair Display (italic)

## Animations
- `animate-candle-glow` — breathing gold dot
- `animate-fade-in-up` — entrance animation
- `animate-golden-pulse` — CTA button glow
