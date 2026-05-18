# Animez

Animez is a platform for discovering, searching, tracking, and sharing anime with a community. The app focuses on trending anime discovery, personal profiles, anime lists, and social feed interactions.

## Live Site

- Production: [https://animez.site](https://animez.site)
- Canonical SEO URL: [https://www.animez.site](https://www.animez.site)

## Features

- Discover trending and top-rated anime.
- Search anime by keyword, filters, and sorting options.
- Register, log in, recover passwords, and reset passwords with Supabase Auth.
- Manage user profiles, avatars, statistics, and anime lists.
- Use a social feed with posts, images, comments, and public profile pages.
- Get anime recommendations through user recommendation sessions.
- Support for English, Vietnamese, and Japanese.
- SEO support with metadata, sitemap, robots, Open Graph, and JSON-LD.

## Tech Stack

- [Next.js](https://nextjs.org/) 16 with App Router.
- [React](https://react.dev/) 19 and React Compiler.
- [TypeScript](https://www.typescriptlang.org/).
- [Tailwind CSS](https://tailwindcss.com/) 4.
- [next-intl](https://next-intl.dev/) for internationalization.
- [Supabase](https://supabase.com/) for authentication and user data.
- [AniList GraphQL API](https://anilist.gitbook.io/anilist-apiv2-docs/) for anime data.
- Cloudflare R2 with S3-compatible storage for social post images.
- TanStack Query, Framer Motion, Recharts, Lucide React, and Vercel Analytics.

## Requirements

- A Node.js version compatible with Next.js 16.
- npm.
- A configured Supabase project with Auth enabled.
- A Cloudflare R2 bucket if social image uploads are used.

## Installation

```bash
npm install
```

Create a `.env` file in the project root and configure the required variables:

```env
NEXT_PUBLIC_SITE_URL=https://www.animez.site
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
```

Notes:

- `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT` is optional.
- The `R2_*` variables are required for uploading and deleting social post images.
## Local Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app routes by locale, for example `/en`, `/vi`, or `/ja`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

- `npm run dev`: start the development server.
- `npm run build`: create a production build.
- `npm run start`: run the production build.
- `npm run lint`: run ESLint.

## Project Structure

```text
src/
  app/                 App Router, route handlers, metadata, sitemap, robots
  components/          UI, layout, anime, auth, profile, search, and social
  i18n/                Locale and i18n request configuration
  lib/                 API clients, Supabase, SEO, social actions, and utilities
  types/               Shared TypeScript types
messages/              Translation messages for en, vi, and ja
docs/                  Planning documents and feature specifications
supabase/              Supabase-related resources
public/                Static assets
```

## Deployment

The project is suitable for deployment on Vercel. Configure the required environment variables in the production environment before deploying.

After deployment, verify the main routes:

- `/en`
- `/vi`
- `/ja`
- `/en/search`
- `/en/feed`
- `/en/login`

## Development Notes

- Keep UI changes consistent with the existing component system in `src/components/ui`.
- Prefer Tailwind CSS for styling.
- Use `useMemo`, `useCallback`, and `memo` only when they provide clear value for performance or reference stability.
