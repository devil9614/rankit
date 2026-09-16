# RankIt

RankIt is a public ranking game: publish your order, share it, and let visitors make five fast pairwise choices to move the community ranking.

## What is built

- Anonymous creation with Firebase Auth
- One-click starter packs, paste-to-rank input, and topic-aware item additions
- Public, permanent list pages
- Touch-friendly drag ordering
- Creator and community rankings displayed separately
- Server-verified Elo voting, with one vote per visitor per matchup and a five-vote session cap
- Dynamic per-list Open Graph images
- Curated seed-list script and Firebase security rules

## Connect Firebase

1. Create a Firebase project and register a web app.
2. Enable **Anonymous** sign-in in Firebase Authentication.
3. Create a Firestore database.
4. Copy `.env.example` to `.env.local` and add the web-app settings plus a Firebase service account’s `project_id`, `client_email`, and `private_key`.
5. Deploy the included Firestore rules and index configuration:

   ```bash
   npx firebase-tools deploy --only firestore
   ```

6. Create the initial public lists:

   ```bash
   npm run seed
   ```

The browser only receives the `NEXT_PUBLIC_FIREBASE_*` values. The service-account values remain server-only and are required for trusted vote writes.

## Run locally

```bash
npm run dev
```

## Deploy

Deploy the Next.js app to Vercel. Add every value from `.env.local` to the Vercel project’s environment settings, then point `rankit.logidev.in` to that project. Firebase remains the identity and database layer; Vercel only runs the website and secure vote endpoint.
