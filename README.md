# Elastic Phrase

Monophonic melody generator — sibling to [Elastic Composer](https://elasticcomposer.app).

**Live:** [elastic-phrase.vercel.app](https://elastic-phrase.vercel.app)

## v0.6 — Akkord-Input, Feel, Pop Hook

- **Akkord-Text** — `Am7 | D7 | Gmaj7 | C` direkt eingeben (ohne Composer)
- **Feel-Panel** — Swing + Humanize für Playback und MIDI-Export
- **Pop Hook** — pentatonisches 2-Takt-Motiv mit Variation

## v0.5 — Bebop + Share Link

- **Bebop-Stil** — Achtel-Linien, chromatische Annäherungen, Terz/Septime-Betonung
- **⎘ Link** — Einstellungen + Seed als URL kopieren (`#s=` Hash)
- Share-Link stellt Tonart, Stil, Euklid, Klang und optional Akkordfolge wieder her

## v0.4 — MusyngKite Sound

- **5 Instrumente:** Flöte, Konzertflügel, Klavier, Rhodes, Pad
- **Lokal gehostet** unter `/assets/soundfonts/MusyngKite/` (wie Composer)
- **Hall-Regler** + Preload beim ersten Klick
- Playback wartet auf Soundfont-Laden (kein Synth-Race mehr)

## v0.3 / v1.2

- **Flöte (MusyngKite CDN)** — Soundfont-Preview mit Synth-Fallback
- **Euklid-Rhythmus** — Pulses/Steps/Rotation + Skala-Euklid für Stufen
- **Composer-Rückweg** — `#p=` Import in Elastic Composer

## v0.2 / v1.1

- **▶ Abspielen** — Web-Audio-Vorschau (monophon)
- **Akkordfolge** — Import aus Elastic Composer (`→ Elastic Phrase`)
- **Akkordbewusste Melodie** — Zielton-Noten auf Akkordtönen
- **→ Composer** — Phrase + Folge als `ElasticContext` zurücksenden

## v0.1 (POC)

- **Input:** tonic, church mode, style (Modal Jazz / Blues basis)
- **Output:** rule-based phrase + piano-roll preview + `.mid` export
- **Stack:** static HTML + vanilla JS (same Elastic Universe shell/tokens as Composer)

## Local dev

```bash
npm install
npm start
# → http://localhost:3344
```

## Tests

```bash
npm test
npm run test:e2e
```

## Deploy

```bash
npm run deploy
```

Vercel project: `elastic-phrase` (Frank's projects). Push to `main` triggers CI; connect Git in Vercel for auto-deploy.

## Custom domain

Planned: **elasticphrase.app** (purchase early September 2026). Setup steps: [`docs/custom-domain.md`](docs/custom-domain.md).

## Roadmap

- v1.1: chord-aware generation + Composer handoff (`ElasticContext`)
- v1.2: Web MIDI preview, more styles (pop hook)
- v1.4: Bebop style + share links ✓
- v1.5: chord text input, swing/humanize, pop hook ✓
