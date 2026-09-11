# 0003. Build as npm workspaces: Fastify server and React/Vite client, TypeScript throughout

Date: 2026-09-11
Status: Accepted

## Context

The supplied architecture proposes a React/TypeScript frontend with a Node-compatible application
and a separate worker, keeping identity, learning, content, submissions, review, evidence and
lifecycle as explicit modules in one codebase. The checkpoint needs the same module discipline at a
fraction of the size, and a test setup that can exercise HTTP behavior directly.

## Decision

One repository, npm workspaces: `apps/server` (Fastify, TypeScript) and `apps/web` (Vite, React,
TypeScript). Domain modules live under `apps/server/src/modules/<area>/`, named for the areas the
architecture names. Vitest for unit and HTTP-level integration tests; Playwright for keyboard,
responsive and rendering checks. No background worker — nothing in this checkpoint is asynchronous
beyond a request.

## Alternatives considered

- **Next.js full-stack.** Rejected: heavier build tooling, and its file-based routing blurs the
  module boundary the architecture asks us to keep visible. Nothing here needs SSR or its routing.
- **Single process serving the built client from the server only.** Partially adopted: the server
  does serve the production build, but a separate Vite dev server stays for fast iteration.

## Consequences

Easier: the server can be tested over real HTTP without a browser; client and server share types
through the workspace; the module layout maps onto the specification's module table.
Harder: two dev processes during development, and a workspace setup to keep in order. Revisit if
the app ever needs background work (content re-import at scale, exports that outlive a request).
