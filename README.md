# RankIt

RankIt is a public ranking game: publish your order, share it, and let visitors make five fast pairwise choices to move the community ranking.

## What is built

- Anonymous creation with Firebase Auth
- One-click starter packs, paste-to-rank input, and AI-backed item suggestions (falls back to a built-in offline list with no key configured)
- Public, permanent list pages that update live as votes come in
- Touch-friendly drag ordering
- Creator and community rankings displayed separately
- Atomic Elo voting protected by Firestore rules, with one vote per visitor per matchup and a five-vote session cap
- A personal "verdict" reveal after voting: your order vs. the room, with a contrarian score, once you've cast your five picks
- A no-account "Your rankings" page (`/mine`) that remembers what you made and judged in this browser
- Dynamic per-list Open Graph and Twitter card images that reflect live vote counts
- Curated seed-list script and Firebase security rules

## Connect Firebase

1. Create a Firebase project and register a web app.
2. Enable **Anonymous** sign-in in Firebase Authentication.
3. Create a Firestore database.
4. Copy `.env.example` to `.env.local` and add the Firebase web-app settings.
5. Deploy the included Firestore rules and index configuration:

   ```bash
   npx firebase-tools deploy --only firestore
   ```

6. Create the initial public lists:

   ```bash
   npm run seed
   ```

The web configuration is sufficient for creation, public pages, voting, share cards, and seed data. No paid service or service-account secret is required.

## Optional: AI-backed suggestions

The "Find suggestions" tool on `/create` calls a low-cost model through [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) when `AI_GATEWAY_API_KEY` is set, and silently falls back to a built-in offline list (works with zero setup, zero cost, and never fails) when it is not. To enable it:

1. In the Vercel dashboard, open **AI Gateway → API Keys** for your team and create a key.
2. Add it as `AI_GATEWAY_API_KEY` in your environment (see `.env.example`).

No dependency was added for this — the route calls the Gateway's OpenAI-compatible REST endpoint directly with `fetch`.

## Run locally

```bash
npm run dev
```

## Deploy

Deploy the Next.js app to Vercel. Add every value from `.env.local` (the Firebase settings, and optionally `AI_GATEWAY_API_KEY` and `NEXT_PUBLIC_SITE_URL`, see `.env.example`) to the Vercel project's environment settings, then point `rankit.logidev.in` to that project. Firebase remains the identity and database layer; Vercel only runs the website and secure vote endpoint.

If you update `firestore.rules` or `firestore.indexes.json` after the initial launch, redeploy them:

```bash
npx firebase-tools deploy --only firestore
```
