# Custom Domain — Elastic Phrase

Geplant: **elasticphrase.app** (Kauf Anfang September 2026).

## Vorbereitung (jetzt)

- Production läuft auf [elastic-phrase.vercel.app](https://elastic-phrase.vercel.app)
- Vercel-Projekt: `elastic-phrase` unter **Frank's projects**

## Nach Domain-Kauf

1. **DNS beim Registrar** (z. B. Vercel DNS oder extern):
   - `A` → `76.76.21.21` (Vercel)
   - `CNAME` für `www` → `cname.vercel-dns.com` (optional)

2. **Vercel Dashboard** → Project `elastic-phrase` → **Settings → Domains**
   - Domain hinzufügen: `elasticphrase.app`
   - optional: `www.elasticphrase.app` → Redirect auf Apex

3. **SSL:** Vercel stellt Zertifikat automatisch aus (meist wenige Minuten).

4. **Smoke-Test:**
   - Seite lädt über neue Domain
   - `Phrase generieren` + MIDI-Export
   - Favicon ohne 404

## Git ↔ Vercel (empfohlen)

Im Vercel-Dashboard: **Settings → Git** → Repository `fraendk-lang/elastic-phrase` verbinden, damit jeder Push auf `main` automatisch deployed.
