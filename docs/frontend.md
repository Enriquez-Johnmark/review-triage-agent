# Frontend: the dashboard

The dashboard in `web/` is React with Vite, TanStack Query, shadcn/ui (Base UI, "nova" style) and Recharts. It only shows data and asks the API to act; every rule that protects an acceptance criterion stays in `src/core/` and the API.

Before writing or reviewing React, read the skills in `.claude/skills/`:

| Skill                         | Use it for                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vercel-react-best-practices` | Performance: waterfalls, bundle size, re-renders. Read `rules/*.md`, not the compiled `AGENTS.md`, which is garbled in places upstream. These don't apply to a Vite app: every `server-*` rule, `async-api-routes`, `async-suspense-boundaries`, `bundle-dynamic-imports` (use `React.lazy`), `bundle-defer-third-party` and the `rendering-hydration-*` and `rendering-script-defer-async` rules. Where a rule uses SWR, read it as TanStack Query |
| `vercel-composition-patterns` | Component design: compound components, explicit variants, no boolean-prop piles, React 19 APIs. Its examples use React Native components; the patterns are the same on the web                                                                                                                                                                                                                                                                      |
| `shadcn`                      | Composing and styling shadcn/ui components. Skip its chat, registry, MCP and design-system files                                                                                                                                                                                                                                                                                                                                                    |

Where a skill and this file disagree, this file wins.

## Where the skills come from

Installed in Kompleto on 2026-10-22 and copied unchanged into Balanse on 2026-10-24 and into this repository on 2026-11-07, with the same entries in `skills-lock.json` (the hash covers each folder as installed, local changes included). All three were read in full before being committed; they hold guidance only, apart from the shadcn changes below. They are kept exactly as installed, so Prettier skips them.

| Skill                         | Source                                                             | Commit                 | Licence                                                                               |
| ----------------------------- | ------------------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------- |
| `vercel-react-best-practices` | github.com/vercel-labs/agent-skills, `skills/react-best-practices` | `063bee9` (2026-08-28) | MIT, declared in its `SKILL.md`; the repository has no licence file or copyright line |
| `vercel-composition-patterns` | the same repository, `skills/composition-patterns`                 | `063bee9`              | MIT, as above                                                                         |
| `shadcn`                      | github.com/shadcn-ui/ui, `skills/shadcn`                           | `25af02b` (2026-10-22) | MIT, Copyright (c) 2023 shadcn; the licence is in the folder as `LICENSE.md`          |

**Local changes to `shadcn/SKILL.md`**, made in Kompleto (re-apply them after any update):

- removed `allowed-tools`, which pre-approved every `shadcn` command with any arguments, including adding code from any web address;
- removed the line that ran `npx shadcn@latest info` automatically, unpinned, each time the skill loaded. It says to run the pinned `pnpm dlx shadcn@4.22.1 … -c web` by hand; its note names Kompleto, and applies here unchanged, since the dashboard is also in `web/`.

## Components

The components in `web/src/components/ui/` are vendored as Kompleto and Balanse vendor them (see the README there), because this environment's network blocks `ui.shadcn.com`. If the shadcn command line is used:

- always the pinned version above, never `@latest`;
- only the official shadcn registry; any other registry or web address needs the owner's yes.
