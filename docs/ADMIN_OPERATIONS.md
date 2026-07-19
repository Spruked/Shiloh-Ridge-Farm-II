# Admin Operations

The admin interface is private. Authentication is required for dashboard, customer, livestock, pricing, accounting, settings, and Shep owner-tool routes. Search engines are instructed not to index these routes, and they are excluded from the public sitemap.

## Persistence

Administrative business records use MongoDB's named persistent volume. Durable file state uses the root `vault_system/`. Creating revenue or expenses writes to MongoDB and survives application container rebuilds. Daily MongoDB and vault snapshots are stored under `vault_system/backups/` and are not committed to Git.

## Accounts and password reset

Administrators may sign in with username or email. An authenticated administrator can reset their password from Admin Settings, which calls `PUT /api/auth/password`. Passwords are stored as hashes; plaintext passwords must never appear in documentation, Git history, logs, or exports.

If every administrator is locked out, use the backend's controlled account-recovery procedure from the host and immediately rotate the temporary password after login. Do not add credentials to `.env.example`, README files, shell history, or support tickets.

## Accounting checks

The accounting page supports persistent revenue and expense creation, aggregation, and deletion. After deployment, verify both record types with disposable entries and remove those entries after confirming the summary. Never run tests against real records by changing or deleting them.

## SEO boundary

Public pages receive unique titles, descriptions, canonical URLs, Open Graph metadata, and internal links. Admin, account, dashboard, cart, checkout, login, and mobile operations routes receive `noindex, nofollow`. Public SEO improvements must not expose protected routes or private data.
