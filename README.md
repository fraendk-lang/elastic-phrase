# Elastic Phrase

Monophonic melody generator — sibling to [Elastic Composer](https://elasticcomposer.app).

**Live:** [elastic-phrase.vercel.app](https://elastic-phrase.vercel.app)

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
- v1.2: Web MIDI preview, more styles (bebop, pop hook)
