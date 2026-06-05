---
## Form

Always use formsnap for our form handling library
---

## Data loading

Use `+page.server.ts` or `+layout.server.ts` for data loading, this prioritized rather than run query on client side.
Never use `<Domain>Service` class from `$lib/server/services/[domain]`, Always use `client` from "$lib/orpc"
`<Domain>Service` are intended for internal purposes only, not for data loading nor form handling.

---
