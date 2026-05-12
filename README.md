# Mobile TV Tracker

En mobilanpassad React-app för att söka, följa och organisera serier/filmer från TMDb.

## Funktioner

- Sök i serier och filmer
- Favoriter och watched-listor
- Översikt, profil, upcoming och inställningar
- PWA-stöd (service worker + manifest)
- Valfri AI-endpoint för tittips via separat Express-server

## Tech stack

- React 18 + Vite
- React Router
- Tailwind CSS
- Express (valfritt backend-läge för AI)
- GitHub Pages (publicering av frontend)

## Kom igång

### 1) Installera beroenden

```bash
npm install
```

### 2) Skapa lokal miljöfil

Skapa en `.env` i projektroten och utgå från `.env.example`.

Minsta frontend-variabler för TMDb:

```env
VITE_TMDB_API_KEY=din_tmdb_api_key
VITE_TMDB_BASE_URL=https://api.themoviedb.org/3
VITE_IMAGE_BASE_URL=https://image.tmdb.org/t/p/w500
```

Valfria server-variabler (om du använder AI-endpointen):

```env
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-4o-mini
CORS_ORIGIN=http://localhost:5173
```

### 3) Starta appen lokalt

Frontend:

```bash
npm run dev
```

Valfri backend för AI-funktioner (i separat terminal):

```bash
node server/index.js
```

Frontend kör normalt på `http://localhost:5173`.

## Scripts

- `npm run dev` startar Vite i utvecklingsläge
- `npm run build` bygger produktion till `dist`
- `npm run preview` förhandsvisar byggd version
- `npm run lint` kör ESLint
- `npm run round:icons` rundar PWA-ikoner via script
- `npm run deploy` publicerar `dist` till GitHub Pages

## Deploy

Deploy är manuell i nuläget.

```bash
npm run deploy
```

Detta kör:

1. `predeploy` -> `npm run build`
2. `deploy` -> `gh-pages -d dist`

Publicerad URL:

- https://ecthelionofthefountain-510.github.io/mobile-tv-tracker/

## Noteringar

- Projektet använder `HashRouter`, vilket passar bra för GitHub Pages.
- `.env` är ignorerad i git och ska inte committas.
- Behåll `.env.example` som mall för team/onboarding.
