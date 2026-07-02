# Veneer

Veneer is a lightweight way to make the text and images on your website editable, right on the
page, without a separate admin dashboard. You mark the parts you want to edit, sign in, flip on
edit mode, change the content in place, and it saves to your database.

This guide walks you through setting it up in a Next.js app, step by step. If you have never done
this kind of thing before, that is fine. Follow each step in order and copy the code exactly.

## Table of contents

1. [How it works in plain words](#how-it-works-in-plain-words)
2. [Client side and server side](#client-side-and-server-side)
3. [Before you start](#before-you-start)
4. [Step 1, install Veneer](#step-1-install-veneer)
5. [Step 2, get a database](#step-2-get-a-database)
6. [Step 3, add your secrets](#step-3-add-your-secrets)
7. [Step 4, create the config file](#step-4-create-the-config-file)
8. [Step 5, add the backend route](#step-5-add-the-backend-route)
9. [Step 6, create the database tables](#step-6-create-the-database-tables)
10. [Step 7, create your login](#step-7-create-your-login)
11. [Step 8, wrap your app](#step-8-wrap-your-app)
12. [Step 9, mark content as editable](#step-9-mark-content-as-editable)
13. [Step 10, run it and edit](#step-10-run-it-and-edit)
14. [Creating and managing tags](#creating-and-managing-tags)
15. [Tag naming rules](#tag-naming-rules)
16. [Settings reference](#settings-reference)
17. [Command reference](#command-reference)
18. [Troubleshooting](#troubleshooting)
19. [App Router or Pages Router](#app-router-or-pages-router)
20. [Using Veneer without Next](#using-veneer-without-next)
21. [Packages](#packages)

## How it works in plain words

- A **tag** is a name for one managed spot on your site, like `hero-title` or `footer-note`.
- You put a tag on an HTML element using an attribute named `data-veneer-{tag}`. For a tag called
  `hero-title` the attribute is `data-veneer-hero-title`.
- When a page loads, Veneer **crawls it for every `data-veneer-` attribute**, loads the saved
  content from your database, and shows it to **all visitors**. For text elements it fills in the
  text. For an `<img>` it sets the image source.
- It keeps watching the page, so content on pages you navigate to, and anything added later, is
  filled in automatically. You do not have to do anything special for routing.
- When a **superuser** or **editor** signs in and turns on edit mode, those same spots become
  editable in place. You change as many as you like, then click **Save** to store them all. A
  popup confirms the result.
- The `<Editable>` component is **optional**. The attribute alone is all Veneer needs, whether it
  is on plain HTML or produced by the component.
- There are two kinds of users. A **superuser** can create new tags and edit everything. An
  **editor** can only change tags that already exist.

## Client side and server side

Veneer has two halves. Knowing which half a file belongs to tells you where it runs and why your
secrets stay safe. The browser never touches your database and never sees your secrets.

**Server side.** This runs in Node, on your machine while developing or on your host in
production. It can reach the database and it holds your secrets.

- Files: your `veneer.config.ts`, your `.env.local` secrets, and the backend route at
  `app/api/veneer/route.ts`.
- Packages: `@veneer/server` (the handler), `@veneer/db-postgres` (the database), `@veneer/auth-jwt`
  (login and tokens), and `@veneer/cli` (the terminal command).

**Client side.** This runs in the browser, on the page your visitors see. It has no database
access and no secrets.

- Files: your pages and layout, the `data-veneer-` attributes, the provider, and the edit bar.
- Package: `@veneer/react` (the provider, the page scanner, the `<Editable>` component, the hooks).

**Both sides.**

- `@veneer/core` holds shared types and the request handling rules. The types are used on both
  sides. The handler itself only runs on the server.
- `@veneer/next` is a convenience bundle. The route handler it gives you is server side, and the
  React pieces it re-exports are client side. You import from one package, but each piece still
  runs on its proper side.

**The things the client asks the server to do are called actions.** They are: sign in, sign out,
check who is signed in, read content, create a tag, and save content. The client never does these
itself, it asks the server, and the server decides who is allowed to do each one.

**How a save travels, end to end.**

1. In the browser you edit a spot and click away. (client)
2. The client sends the new text as a save action to the backend route at `/api/veneer`. (client
   to server)
3. The route checks your login and your role, then writes to the database. (server)
4. The route sends the saved content back, and the page shows it. (server to client)

This is why the browser never needs your database password. Only the server side ever has it.

## Before you start

You need these things ready first.

- **Node.js version 16 or newer.** Check your version by running `node --version` in a terminal.
- **A Next.js app** to add Veneer to. If you do not have one yet, create one with
  `npx create-next-app@latest` and choose the App Router and TypeScript when it asks.
- **A Postgres database.** Step 2 shows the easiest way to get one if you do not have one.
- **A terminal** open in the root folder of your Next.js app. The root folder is the one that
  has your `package.json` file in it.

## Step 1, install Veneer

In your terminal, in the root of your Next.js app, run one of these depending on which package
manager you use.

Using npm:

```sh
npm install @veneer/next @veneer/core @veneer/cli
```

Using pnpm:

```sh
pnpm add @veneer/next @veneer/core @veneer/cli
```

Using yarn:

```sh
yarn add @veneer/next @veneer/core @veneer/cli
```

What these are:

- `@veneer/next` is the main package for Next.js. It includes the backend handler and the React
  pieces you put on the page.
- `@veneer/core` gives you a small helper for writing your config file.
- `@veneer/cli` gives you the `veneer` command you use to set up the database.

## Step 2, get a database

Veneer stores your editable content in Postgres. If you already have a Postgres database, skip to
the next step and use its connection details.

The quickest way to get one on your own machine is Docker. If you have Docker installed, run this
single command. It starts a database named `veneer` with the username and password both set to
`veneer`.

```sh
docker run --name veneer-pg -e POSTGRES_USER=veneer -e POSTGRES_PASSWORD=veneer \
  -e POSTGRES_DB=veneer -p 5432:5432 -d postgres:16
```

Your connection string for this database is:

```
postgres://veneer:veneer@localhost:5432/veneer
```

A connection string is just one line that holds the username, password, address, and database
name all together. If you use a hosted database from a provider, they will give you a connection
string that looks similar.

## Step 3, add your secrets

Secrets are values you do not want to write directly in your code, like your database password.
Next.js reads them from a file named `.env.local` in the root of your app.

Create a file named `.env.local` and put these two lines in it. Change the database line if your
database is different, and change the secret to a long random string of your own.

```
DATABASE_URL=postgres://veneer:veneer@localhost:5432/veneer
VENEER_JWT_SECRET=replace-this-with-a-long-random-secret-string
```

The `VENEER_JWT_SECRET` is used to keep logins secure. It must be at least 16 characters. A good
way to make a random one is to run this command and paste the result:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Make sure `.env.local` is listed in your `.gitignore` file so your secrets are never committed.
Next.js apps already ignore it by default.

## Step 4, create the config file

_This is server side. It holds your database details and secret, and is never sent to the
browser._

This one file tells Veneer how to reach your database and how logins work. Create a file named
`veneer.config.ts` in the root of your app with exactly this content.

```ts
import { defineConfig } from '@veneer/core';

export default defineConfig({
  //Turn the edit in place feature on.
  editInView: true,

  //Where the backend route lives. Keep this as is unless you change Step 5.
  apiBasePath: '/api/veneer',

  //Your database. The connection string is read from your .env.local file.
  database: {
    provider: 'postgres',
    connectionString: process.env.DATABASE_URL,
  },

  //Login settings. The secret is read from your .env.local file.
  auth: {
    provider: 'jwt',
    jwtSecret: process.env.VENEER_JWT_SECRET ?? '',
  },
});
```

## Step 5, add the backend route

_This is server side. It is the only part that talks to your database._

The browser cannot talk to your database directly, that would not be safe. Instead it talks to a
small backend route, and the route talks to the database. Next.js calls these route handlers.

Create a file at this exact path: `app/api/veneer/route.ts`. Put this in it.

```ts
import { createVeneerRouteHandler } from '@veneer/next';

import veneerConfig from '../../../veneer.config';

//This builds the backend handler from your config file.
const { POST } = createVeneerRouteHandler(veneerConfig);

//Veneer needs the Node runtime because it connects to Postgres.
export const runtime = 'nodejs';

export { POST };
```

## Step 6, create the database tables

_This runs in your terminal, on the server side, and reaches the database directly._

Veneer needs a couple of tables in your database to store content and users. The cli creates them
for you. Run this in your terminal from the root of your app.

```sh
npx veneer migrate
```

You should see a message that says the migrations are up to date. The cli reads your database
details from the same `.env.local` file, so there is nothing else to set up. If you get an error
here, see [Troubleshooting](#troubleshooting).

## Step 7, create your login

_This runs in your terminal, on the server side._

Now create your first user. Make this one a superuser so you can create tags. Replace the email
and password with your own.

```sh
npx veneer create-superuser --email you@example.com --password choose-a-strong-password
```

You will use this email and password to sign in on the page in a moment.

To add a regular editor later, who can change existing content but cannot create, retype, or delete
tags, use `create-user` instead:

```sh
npx veneer create-user --email editor@example.com --password choose-a-strong-password
```

## Step 8, wrap your app

_This is client side. It runs in the browser._

Veneer needs to wrap your app so it can load content and manage edit mode. Open your root layout
file at `app/layout.tsx` and wrap your content with the provider, and add the edit bar.

```tsx
import type { ReactNode } from 'react';

import { VeneerProvider, VeneerEditBar } from '@veneer/next';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <VeneerProvider apiBasePath="/api/veneer">
          {children}
          <VeneerEditBar />
        </VeneerProvider>
      </body>
    </html>
  );
}
```

The `VeneerEditBar` is a small bar in the corner of the page where you sign in and turn edit mode
on and off. You can remove it later and build your own controls, but it is the easy way to start.

**Three ways to edit.** Veneer gives you three editing styles, so you can pick the one that fits
your site.

1. **Edit in place (default).** Editing happens right on the page, where you click a spot and type.
   This is on by default.

2. **Popup form.** Pass `editInView={false}` to the provider to edit through a form instead:

   ```tsx
   <VeneerProvider apiBasePath="/api/veneer" editInView={false}>
   ```

   Clicking **Edit page** opens a full screen, scrollable popup that lists every tag with its own
   labeled inputs, prefilled with the saved content. You change what you want and click **Save**. A
   loading spinner shows while the content is fetched. This is handy when the editable spots are
   hard to click on the page, or when you want to edit many tags at once.

3. **Full page admin panel.** For a traditional admin panel on its own page, render
   `VeneerAdminPanel` on a dedicated route instead of the `VeneerEditBar`. See
   [Full page admin panel](#full-page-admin-panel) below.

**Reacting to edit mode in your own code.** If you want your own components to know when someone is
editing, read it from the context. The `useIsEditing` hook returns a single boolean that is true
only while edit mode is on:

```tsx
import { useIsEditing } from '@veneer/react';

function Banner() {
  const isEditing = useIsEditing();

  return isEditing ? <div>You are editing this page</div> : null;
}
```

The full context is also available through `useVeneer()`, which includes `isEditing`, `canEdit`,
the current `user`, and the actions.

### Full page admin panel

If you would rather manage your content from a traditional admin panel, instead of on top of your
live site, render `VeneerAdminPanel` on its own route. It is a full page view that does not need
the `VeneerEditBar`. Give it a route your visitors will not stumble onto, like `/admin`, and wrap
it in the same `VeneerProvider`.

For the Next.js app router, create `app/admin/page.tsx`:

```tsx
'use client';

import { VeneerProvider, VeneerAdminPanel } from '@veneer/next';

export default function AdminPage() {
  return (
    <VeneerProvider apiBasePath="/api/veneer" richText>
      <VeneerAdminPanel />
    </VeneerProvider>
  );
}
```

Here is what you get:

- **A full page login.** When nobody is signed in, the whole page is a sign in form. There is no
  floating bar and nothing from your site behind it.
- **Navigation tabs.** Once signed in, a top bar shows your email and a sign out button, with tabs
  to switch between **View tags**, **Create tag**, and **Edit tags**. The Create tab only shows for
  superusers, since only they can create tags.
- **View tags.** A read only list of every tag with a short preview of its content. It has a search
  box and pages ten tags at a time.
- **Create tag.** A form to add a new tag, with a type dropdown when `richText` is on.
- **Edit tags.** A searchable list, again ten per page, where each tag opens an inline editor
  prefilled with its saved content. Superusers can also change a tag's type or delete it here.

This mode works well when your editors want a dashboard to work from, rather than editing on the
page itself. You can use it on its own, or alongside the in place editor on your main site.

## Step 9, mark content as editable

_This is client side. These are the elements in your pages._

Pick the spots on your site you want Veneer to manage and give each one a tag. You do this by
adding a `data-veneer-{tag}` attribute to any normal HTML element. That is all that is needed.
Veneer will show the saved content there to everyone, and make it editable for signed in editors.

```tsx
export default function HomePage() {
  return (
    <main>
      <h1 data-veneer-hero-title>Welcome to my site</h1>
      <p data-veneer-hero-body>This text can be edited right on the page.</p>

      {/* On an image, Veneer sets the src from the saved content. */}
      <img data-veneer-hero-image src="/placeholder.png" alt="Hero" />
    </main>
  );
}
```

A few things worth knowing:

- **The content inside the element is the fallback.** It shows until something is saved for that
  tag. Once content is saved, Veneer shows the saved content to every visitor.
- **You do not need a component.** Plain HTML with the attribute is the main way to use Veneer.
- **It works on pages you navigate to.** Because Veneer watches the page, tags on other routes are
  filled in automatically as you move around the site.

If you would rather write a component than a raw attribute, the optional `<Editable>` component
produces the same attribute for you:

```tsx
import { Editable } from '@veneer/next';

export default function HomePage() {
  return (
    <main>
      <h1>
        <Editable tag="hero-title">Welcome to my site</Editable>
      </h1>
    </main>
  );
}
```

Both ways behave the same. Use whichever you like, or mix them.

## Step 10, run it and edit

Start your app the normal way.

```sh
npm run dev
```

Open your site in the browser. Then:

1. Find the dark bar in the bottom corner of the page.
2. Sign in with the email and password you made in Step 7.
3. Click **Edit page**. Your editable spots get a dashed outline.
4. Click into one or more spots and change the text.
5. Click **Save**. It asks you to confirm, saves every change at once, and shows a popup with the
   result.
6. Reload the page. Your changes are still there because they were saved to the database.

Two buttons control editing while it is on:

- **Save** stores all your changes. It asks you to confirm first.
- **Close** leaves edit mode. If you have changes you have not saved, it warns you first so you do
  not lose them by accident.

There is also a **?** button in the bar. Click it any time for a short in page help popup with
tips on finding editable spots, saving, closing, and, for a superuser, creating and deleting tags.
Close the popup with its **X** or by pressing the **?** again.

That is the whole loop. You are now editing your static site in place.

## Creating and managing tags

Only a superuser can create tags. An editor can only change tags that already exist. There are two
ways for a superuser to create one.

**By editing (the simple way).** When you are signed in as a superuser and you edit a
`data-veneer-` spot that has never been saved before, that first save creates the tag in the
database. After that, editors can change it too. So for most cases you do not need to do anything
special, just edit and save.

**With the Tags panel.** When you sign in as a superuser, the edit bar shows a **Tags** button.
Click it to open a panel where you can:

- Create a tag by name, with an optional starting text.
- See the list of tags that already exist.
- Delete a tag. A confirm popup asks you first, because deleting a tag removes its saved content
  and cannot be undone.

This is useful when you want to set up a tag ahead of time so an editor can fill it in later. Keep
in mind a tag only appears on a page where an element actually has that `data-veneer-{tag}`
attribute, so creating a tag here does not put anything on a page by itself. It just registers the
tag so it exists and can be edited.

Only a superuser can create or delete tags. After you delete a tag, any element that still has its
attribute goes back to showing its fallback text the next time the page loads.

## Tag naming rules

Because the tag becomes part of an HTML attribute name, tag names can only use:

- lowercase letters
- numbers
- hyphens between words

So `hero-title` and `section-2` are fine. `HeroTitle`, `hero title`, and `hero_title` are not.

## Databases

Veneer supports Postgres, MySQL, MariaDB, and SQLite. Postgres comes built in. For the others,
install the matching adapter package so you only pull in the driver you actually use.

| Database        | Install                          | Example config                                                        |
| --------------- | -------------------------------- | --------------------------------------------------------------------- |
| Postgres        | nothing extra                    | `{ provider: 'postgres', connectionString: process.env.DATABASE_URL }` |
| MySQL           | `npm install @veneer/db-mysql`   | `{ provider: 'mysql', connectionString: process.env.DATABASE_URL }`    |
| MariaDB         | `npm install @veneer/db-mariadb` | `{ provider: 'mariadb', connectionString: process.env.DATABASE_URL }`  |
| SQLite          | `npm install @veneer/db-sqlite`  | `{ provider: 'sqlite', filename: './veneer.db' }`                      |

MariaDB uses the MySQL protocol, so `@veneer/db-mariadb` is a thin package that just installs and
re-exports `@veneer/db-mysql` for you. You can install either one for MariaDB, but the MariaDB
named package saves you the confusion of installing something called MySQL. SQLite stores
everything in a single file, which is handy for small sites and local development. The
`veneer migrate` and `veneer create-superuser` commands work the same no matter which one you use.

## Settings reference

These are the settings you can put in `veneer.config.ts`.

| Setting                   | Required | What it does                                                       |
| ------------------------- | -------- | ----------------------------------------------------------------- |
| `database.provider`       | yes      | The database type: `'postgres'`, `'mysql'`, `'mariadb'`, or `'sqlite'`. |
| `database.connectionString` | yes if no host | The one line connection string, for the server databases.  |
| `database.host` and `database.database` | yes if no string | The separate parts, if you do not use a connection string. |
| `database.filename`       | sqlite only | The path to the sqlite database file.                          |
| `auth.provider`           | yes      | The login type. Use `'jwt'`.                                      |
| `auth.jwtSecret`          | yes      | A secret string of at least 16 characters that secures logins.   |
| `auth.accessTtlSeconds`   | no       | How long the short access token lasts. Defaults to 15 minutes.   |
| `auth.refreshTtlSeconds`  | no       | How long the refresh token lasts. Defaults to 7 days. When it expires the user is signed out. |
| `auth.strictRevocation`   | no       | When true, every request checks the session is still active, so logout revokes access at once. Costs one database read per request. Defaults to false. |
| `auth.tokenStorage`       | no       | `'cookie'` (default, a secure httpOnly cookie) or `'header'` (token in the browser, for a separate origin app). |
| `auth.cookieSecure`       | no       | Whether cookies are marked Secure (https only). Defaults to true. Set false for local http dev. |
| `auth.cookieSameSite`     | no       | `'lax'` (default), `'strict'`, or `'none'`. Use `'none'` with a separate origin app. |
| `auth.csrfProtection`     | no       | Turns the csrf check on or off. Defaults to true. Set false only if it causes problems and you understand the risk. |
| `editInView`              | no       | Turns the edit in place feature on. Defaults to off.             |
| `apiBasePath`             | no       | Where the backend route lives. Defaults to `/api/veneer`.        |
| `mode`                    | no       | `'embedded'` for adding to an existing site. This is the default. |
| `cors.origins`            | no       | Allowed origins when the server runs separately. A list of urls, or `'*'`. |

## Sessions and security

Veneer uses two tokens. A short lived **access token** authenticates each request, and a longer
lived **refresh token** quietly gets a new access token when it expires. When the refresh token
itself expires, the user is signed out and simply logs back in. Both lifetimes are set with
`auth.accessTtlSeconds` and `auth.refreshTtlSeconds`.

### Token blocking and revocation, step by step

This is how Veneer stops old or stolen tokens from being used.

1. **On login**, the server starts a token family. It signs an access token and a refresh token,
   and saves a row for the refresh token in the `__Veneer__Refresh_Tokens` table with a family id
   and `revoked = false`.
2. **On a normal request**, the server verifies the access token by its signature and expiry. This
   is fast and needs no database read.
3. **When the access token expires**, the client sends the refresh token. The server checks the
   saved row, then **rotates**: it marks the old refresh token used, issues a brand new access and
   refresh token, and saves a new row in the same family.
4. **If an old, already used refresh token is sent again**, that is a strong sign it was stolen.
   The server **revokes the whole family**, which blocks every token from that login. The real
   user just signs in again.
5. **On logout**, the server revokes the family too, so the refresh token can never be used again.

By default, access tokens are stateless, so a token that was revoked keeps working until it expires
on its own, which is at most `auth.accessTtlSeconds` (15 minutes by default). If you need a logout
or a revoked session to block access **right away**, set `auth.strictRevocation: true`. Then every
request also checks that the session's family is still active, at the cost of one database read per
request. This is the strongest setting and the tradeoff is a little speed.

By default the tokens are kept in **secure httpOnly cookies**, which JavaScript on the page cannot
read, so they are protected from cross site scripting. This is the recommended setup and works for
a Next app served on the same origin as its api.

If your frontend and api are on **different origins** (for example a separate React app), you have
two choices:

- Keep cookie mode, set `auth.cookieSameSite: 'none'` with `auth.cookieSecure: true` (https only),
  and list the app origin in `cors.origins`. The browser then sends the cookie across origins.
- Or set `auth.tokenStorage: 'header'` and pass the matching `tokenStorage="header"` prop to the
  provider. The token is then held by the browser and sent as a bearer header. This is simpler for
  local development but less protected against cross site scripting.

### CSRF protection, step by step

Cross site request forgery is when another website tricks a visitor's browser into making a request
to your site using their logged in cookie. Veneer blocks this with a double submit token.

1. **On login and refresh**, the server sets a second cookie named `veneer_csrf` with a random
   value. Unlike the token cookies, this one is **readable** by JavaScript on your own page.
2. **On every action that changes data** (create tag, save content, change a tag type, delete a
   tag, and logout), the Veneer client reads that cookie and sends the value back in an
   `X-Veneer-Csrf` header.
3. **The server checks** that the header value matches the cookie value. If they do not match, or
   the header is missing, it rejects the request.
4. **Why this works:** another website cannot read your `veneer_csrf` cookie, because browsers only
   let a page read cookies from its own site. So an attacker cannot put the right value in the
   header, and their forged request is rejected. Requiring a custom header also forces the browser
   to ask permission first for cross origin requests, which blocks the simple ones outright.

A few notes:

- **Reads are not affected.** Showing content and signing in do not need the token, so public pages
  and the login form work normally.
- **Header mode does not use this**, because the bearer token is never sent by the browser on its
  own, so there is nothing to forge.
- If you rename the cookie with `auth.csrfCookieName`, pass the same value as the provider's
  `csrfCookieName` prop so the client reads the right cookie.
- If the check ever gets in your way, you can turn it off with `auth.csrfProtection: false`, but it
  is safer to leave it on.

On top of this, the server rejects script tags and obvious database attacks in saved content,
passwords are stored as bcrypt hashes (never plaintext), and every database query is parameterized.

## Command reference

Run these from the root of your app.

| Command                                                       | What it does                          |
| ------------------------------------------------------------ | ------------------------------------- |
| `npx veneer migrate`                                         | Creates or updates the database tables. |
| `npx veneer create-superuser --email EMAIL --password PASS` | Creates a superuser who can make tags.  |
| `npx veneer create-user --email EMAIL --password PASS`      | Creates a regular editor who can only change existing content. |
| `npx veneer update-password --email EMAIL --password PASS`  | Sets a new password for an existing user. |
| `npx veneer list-tags`                                      | Lists every tag in the database.        |
| `npx veneer list-users`                                     | Lists every user and their role.        |
| `npx veneer help`                                           | Shows the available commands.          |

## Troubleshooting

**`npx veneer migrate` cannot connect to the database.**
Check that your database is running and that `DATABASE_URL` in `.env.local` is correct. If you
used the Docker command in Step 2, make sure the container is still running with `docker ps`.

**The cli says it cannot find a config file.**
Run the command from the root folder of your app, the folder that has `veneer.config.ts` in it.

**I signed in but nothing is editable.**
Make sure you clicked **Edit page** in the bar, and that the user you signed in with exists. Also
check that your elements have a `data-veneer-` attribute with a valid tag name.

**The secret is too short error.**
`VENEER_JWT_SECRET` must be at least 16 characters. Make a longer one with the command in Step 3.

**My content does not save.**
Open your browser developer tools and look at the Network tab while you edit. The request to
`/api/veneer` will show the error message from the backend.

**My saved content is not showing to visitors.**
Check that the element's `data-veneer-` tag exactly matches the tag you saved, that the
`/api/veneer` route is reachable (look for its request in the Network tab), and that the content
was actually saved. Remember the text inside the element is only the fallback until something is
saved for that tag.

## App Router or Pages Router

Veneer works with both. The client side is identical, only the backend route and the wrapper
file differ.

The main guide above uses the **App Router**. If your app uses the **Pages Router**, change two
things.

**1. The API route.** Instead of `app/api/veneer/route.ts`, create `pages/api/veneer.ts`:

```ts
import { createVeneerPagesApiRoute } from '@veneer/next';

import veneerConfig from '../../veneer.config';

//Veneer reads the raw request body, so turn off Next's body parser here.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default createVeneerPagesApiRoute(veneerConfig);
```

**2. The wrapper.** Instead of `app/layout.tsx`, wrap your app in `pages/_app.tsx`:

```tsx
import type { AppProps } from 'next/app';

import { VeneerProvider, VeneerEditBar } from '@veneer/next';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <VeneerProvider apiBasePath="/api/veneer">
      <Component {...pageProps} />
      <VeneerEditBar />
    </VeneerProvider>
  );
}
```

Everything else, the config file, the `data-veneer-{tag}` attributes, the cli commands, and the
edit bar, is exactly the same. The crawler also keeps working as you move between pages in either
router.

## Using Veneer without Next

You do not have to use Next. A plain React app, like one made with Vite, works too. The client
side is exactly the same. The only difference is that you run the Veneer backend as its own small
server, and point your app at it.

Veneer's React support works with **React 16.14 and up**, including 17, 18, and 19. It uses only
basic hooks and does not depend on react-dom, so it fits into old and new React apps alike. React
older than 16.8 is not supported, because Veneer uses hooks.

For plain React, install these:

```sh
npm install @veneer/react @veneer/server @veneer/core @veneer/cli
```

**1. Run a standalone Veneer server.** Create a file, for example `veneer-server.ts`, and start
the server. It reads your `veneer.config` just like the Next route did.

```ts
import { startStandaloneServer } from '@veneer/server';

import veneerConfig from './veneer.config';

startStandaloneServer(veneerConfig, { port: 4000 }).then(() => {
  console.log('Veneer API running on http://localhost:4000');
});
```

Run it with a TypeScript runner such as `npx tsx veneer-server.ts`. Use the same `veneer migrate`
and `veneer create-superuser` commands as before to set up the database.

**2. Allow your app's origin.** If your React app and this server run on different addresses, for
example the app on `http://localhost:5173` and the server on `http://localhost:4000`, the browser
will block the calls unless you allow them. Add a `cors` section to your `veneer.config`:

```ts
cors: {
  origins: ['http://localhost:5173'],
},
```

If they run on the same address, through a dev proxy or a reverse proxy, you do not need `cors`.

**3. Wrap your app and point it at the server.** In your React entry file, wrap your app in the
provider and set `apiBasePath` to the server's url.

```tsx
import { VeneerProvider, VeneerEditBar } from '@veneer/react';

export function Root() {
  return (
    <VeneerProvider apiBasePath="http://localhost:4000">
      <App />
      <VeneerEditBar />
    </VeneerProvider>
  );
}
```

Everything else is the same. Add `data-veneer-{tag}` attributes to your HTML, and content is
displayed and made editable exactly as it is in Next.

If you already have your own Node backend, like Express, you can skip the standalone server and
mount `@veneer/server`'s handler yourself. `createVeneerServer(config).nodeHandler` is a plain
`(req, res)` handler you can attach to any route.

## Types for TypeScript

All of Veneer's shared types are exported so you can use them in your own code. They come from
`@veneer/core`, and are also re-exported from `@veneer/react` and `@veneer/next` so you can import
them from whichever package you already use.

```ts
import type {
  TagType, // 'plain' | 'rich' | 'media'
  ContentRecord, // a saved tag and its content
  Role, // 'superuser' | 'editor'
  AuthUser,
  VeneerUserConfig,
  DatabaseConfig,
} from '@veneer/next';

//The enums are exported as values too, for comparisons.
import { TAG_TYPES, ROLES } from '@veneer/next';
```

Adapter authors can also import the `DbAdapter` and `AuthAdapter` interfaces from `@veneer/core`
to build a new database or auth backend.

## Packages

| Package            | Runs on  | What it does                                                          |
| ------------------ | -------- | -------------------------------------------------------------------- |
| `@veneer/core`       | Both     | Shared types, the config helper and loader, the adapter interfaces, and the request handler |
| `@veneer/server`     | Server   | A framework agnostic Node backend handler you mount in your own backend |
| `@veneer/db-postgres` | Server  | The Postgres database adapter and migrations                        |
| `@veneer/db-mysql`   | Server   | The MySQL and MariaDB database adapter and migrations               |
| `@veneer/db-mariadb` | Server   | A thin alias that installs and re-exports `@veneer/db-mysql` for MariaDB |
| `@veneer/db-sqlite`  | Server   | The SQLite database adapter and migrations                          |
| `@veneer/auth-jwt`   | Server   | Email and password login that issues secure tokens                 |
| `@veneer/cli`        | Terminal | The `veneer` command for migrations and creating users             |
| `@veneer/react`      | Browser  | The provider and page scanner that power `data-veneer-*` editing, plus an optional `<Editable>` component and hooks |
| `@veneer/next`       | Both     | The server side route handler plus the browser side React pieces, in one package |

## More

- The full plan for this project is in [plans/veneer-plan-v1.md](plans/veneer-plan-v1.md).
- Code conventions for working on Veneer itself are in [CONTRIBUTING.md](CONTRIBUTING.md).
- A working example app is in [examples/next-app](examples/next-app).
