# Daybook

A static notes and to-do app built with plain HTML, CSS, and JavaScript. Cloudflare Pages serves the files in `public/`; there is no build step or server-side data store. Notes, labels, theme preference, and tasks are stored in the browser's local storage on each device.

## Run locally

Requires Node.js and npm.

```sh
npm install
npm run dev
```

Wrangler starts a local Pages preview. Open the local URL it prints.

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

The Pages project name in `wrangler.jsonc` and the deploy script must match. The deployment will be available at `https://daybook-notes.pages.dev` if that name is available.

## Deploy with Git integration

Connect this repository in **Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git**. Choose the repository root as the root directory and `public` as the build output directory. There is no build command; if the dashboard requires one, use `exit 0`. Set the production branch to `main` (or the branch you use). New commits will then deploy automatically.

## Data note

This is a browser-local app. Data does not sync between browsers or devices and is cleared if its local storage is removed. Cloudflare Pages hosts the app files only; it does not store user notes.
