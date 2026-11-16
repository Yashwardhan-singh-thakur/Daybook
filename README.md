# DayBook

A calm, editorial notes and to-do app built with Astro and Tailwind CSS v4. The interface is statically generated for Cloudflare Pages. Notes, labels, theme preference, and tasks are stored in browser local storage on each device.

## Run locally

Requires Node.js and npm.

```sh
npm install
npm run dev
```

Astro starts the development server. Open the local URL it prints.

To check the production output locally, run `npm run build` followed by `npm run preview`.

## Deploy to Cloudflare Pages with Wrangler

1. Sign in to Cloudflare from this project:

   ```sh
   npx wrangler login
   ```

2. Create the Pages project once (use a different name if `daybook-notes` is already taken):

   ```sh
   npx wrangler pages project create daybook-notes --production-branch main
   ```

3. Install dependencies and deploy the static site:

   ```sh
   npm install
   npm run deploy
   ```

The Pages project name in `wrangler.jsonc` and the deploy script must match. The deployment will be available at `https://daybook-notes.pages.dev` if that name is available. Connect `daybook.com` to the Pages project in Cloudflare when its DNS is ready.

## Deploy with Git integration

Connect this repository in **Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git**. Use the repository root, `npm run build` as the build command, and `dist` as the build output directory. Set the production branch to `main` (or the branch you use). New commits will then deploy automatically.

## Data note

This is a browser-local app. Data does not sync between browsers or devices and is cleared if its local storage is removed. Cloudflare Pages hosts the app files only; it does not store user notes.
