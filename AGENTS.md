# Agent instructions

After making changes, run `bun run lint` and fix all errors.

Before calling the work done, run `bun run check` (lint, types, unit tests, content check, build, Playwright) and report
its real result.

## Project rules

- **No comments** in code, not even a "why" or a JSDoc: put the invariant in a type, a name, a table or a test.
  `local/no-comments` refuses every comment in every `.js`, `.ts` and `.tsx` file, `src/components/ui` included.
- **Never write the character U+2014** (em dash), in code, copy, tests or docs. `tests/unit/project/no-em-dash.test.ts`
  scans the repository.
- **UI copy is French** with correct accents; identifiers are English. `docs/ubiquitous-language.md` maps one to the
  other.
- **Domains first, layers inside**: the business lives in `src/domains/<domain>/`, each with only the layers it needs.
  `domain/` is plain TypeScript (no React, zod, storage, clock or randomness) and imports only the `domain` layer of
  upstream domains; `application/` imports the `domain` layers of its domain and upstream ones, plus
  `@/shared/application`; `infrastructure/` implements the ports; `components/` reads through the `application`
  surfaces (its own and upstream) and upstream `components`, never a `domain` or `infrastructure` layer. Domains point
  upstream only: `preferences` to `session` to `progress` to `catalog`, declared once in `DIRECT_UPSTREAM` in
  `eslint.config.js`. Import a layer through its entry (`@/domains/session/application`), never a file inside it; a
  relative import never leaves its layer. `src/shared` imports no domain; `src/pages` composes domain components and
  never imports another page; only `src/main.tsx` imports an `infrastructure`. ESLint enforces all of it: never weaken
  a rule, never add a disable comment. `docs/architecture.md` explains where a new file goes.
- **Looks live in `src/components/ui`**: a screen picks a variant and a size and passes layout classes only. A missing
  look is a new variant in the component file; a missing colour is a token in `src/index.css`
  (`docs/design-system.md`). New shadcn primitives come from `bunx --bun shadcn@latest add <name>`; refuse to overwrite
  `button.tsx`.
- **Radix or UI SDK**: what opens a layer comes from the shadcn CLI (Radix); what holds a value in place is built in
  `components/ui` on `@ui-sdk/react`. No widget `role=` and no `onKeyDown` outside
  `src/components/ui`.
- **Nothing moves**: no interaction may move an element already on screen or scroll the page. A state variant changes
  appearance only, never the box; no `scrollIntoView`. Give a new element a `data-testid` so
  `tests/e2e/specs/stability.spec.ts` measures it.
- **Do not edit `content/`** unless the task is about content; check it with `bun run content:check`.
- The owner makes his own commits.
