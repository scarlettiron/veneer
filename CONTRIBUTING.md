# Contributing to Veneer

## Code conventions

These rules are partly enforced by ESLint and Prettier, and partly by review.

### Comments

- Write comments so that people with less software experience can follow them. This is so begginner engineers contributing will be able to decipher the code more easily. 

### Layout and style

- Keep logic readable with a reasonable amount of blank lines between blocks.
- Put values that could be reused anywhere into a constants file under a `constants` folder.
- Put reusable helpers into a utilities file under a `utilities` folder.
- Prefer classes or const functions.
- Separate things into appropriate folders.
- Everything must be strictly typed.

## Tooling

- Node 16 or newer is supported, so do not use syntax newer than ES2021.
- Each package builds dual ESM and CommonJS output with tsup.
- Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` before opening a pull request.
- Use `pnpm changeset` to record a version bump for any user facing change.
