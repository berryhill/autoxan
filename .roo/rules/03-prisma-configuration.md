# Prisma Configuration Guidelines

## Version Information
- **Prisma Version:** 7.7.0 (Prisma 7 with new Rust-free client)
- **Prisma Client:** @prisma/client ^7.7.0
- **Driver Adapter:** @prisma/adapter-pg ^7.7.0
- **Configuration File:** `app/prisma.config.ts`
- **Schema File:** `app/prisma/schema.prisma`
- **Generated Client:** `app/src/generated/prisma`

## Prisma 7 Breaking Changes

### 1. Driver Adapters are Required
- Driver adapters are no longer a preview feature - they are **mandatory**
- For PostgreSQL, use `@prisma/adapter-pg`
- The adapter must be passed to the PrismaClient constructor

### 2. New Generator Provider
- The generator provider changed from `prisma-client-js` to `prisma-client`
- The `output` field is now **required** (no longer generates to node_modules)
- The `previewFeatures = ["driverAdapters"]` should be **removed**

### 3. Import Path Changes
- PrismaClient is now imported from the generated output path, not `@prisma/client`
- Example: `import { PrismaClient } from "../generated/prisma/client.js"`

## Critical Rules for Prisma Schema

1. **NEVER add `url` to the datasource block in `schema.prisma`**
   - The schema.prisma datasource block should ONLY contain `provider`
   - The URL is provided via `prisma.config.ts` at runtime
   ```prisma
   // CORRECT - schema.prisma
   datasource db {
     provider = "postgresql"
   }
   ```
   ```prisma
   // WRONG - DO NOT DO THIS
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")  // ❌ NEVER ADD THIS
   }
   ```

2. **Generator Configuration for Prisma 7**
   ```prisma
   // CORRECT - Prisma 7 generator
   generator client {
     provider = "prisma-client"
     output   = "../src/generated/prisma"
   }
   ```
   ```prisma
   // WRONG - Old Prisma 6 style
   generator client {
     provider        = "prisma-client-js"  // ❌ OLD PROVIDER
     previewFeatures = ["driverAdapters"]  // ❌ NO LONGER NEEDED
   }
   ```

3. **prisma.config.ts handles database URL**
   - Uses `env<Env>("DATABASE_URL")` from `prisma/config`
   - Requires `DATABASE_URL` environment variable to be set
   - Only needed for actual database operations (migrate, push, studio)

4. **NEVER add `postinstall` hooks that run `prisma generate`**
   - Prisma generate requires database configuration
   - CI/CD environments may not have database access during install
   - Use explicit `pnpm db:generate` command when needed

## Driver Adapter Configuration

```typescript
// app/src/lib/db.ts
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

// Create the PostgreSQL adapter
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// Pass adapter to PrismaClient
const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" 
    ? ["query", "error", "warn"] 
    : ["error"],
});
```

## Import Paths

```typescript
// CORRECT - Prisma 7 imports
import { PrismaClient, User, Role } from "../generated/prisma/client.js";
// or with path alias
import { PrismaClient, User, Role } from "@/generated/prisma/client";

// WRONG - Old Prisma 6 imports
import { PrismaClient } from "@prisma/client";  // ❌ NO LONGER VALID
```

## Prisma Commands Reference

| Command | Purpose | Requires DATABASE_URL |
|---------|---------|----------------------|
| `pnpm db:generate` | Generate Prisma Client | Yes |
| `pnpm db:migrate:dev` | Create and apply migrations | Yes |
| `pnpm db:migrate:deploy` | Apply migrations in production | Yes |
| `pnpm db:push` | Push schema changes (dev only) | Yes |
| `pnpm db:studio` | Open Prisma Studio GUI | Yes |
| `pnpm db:seed` | Seed the database | Yes |

## Summary

| ❌ DON'T | ✅ DO INSTEAD |
|----------|---------------|
| Add `url` to schema.prisma datasource | Use prisma.config.ts for URL |
| Add `postinstall: prisma generate` | Run `db:generate` explicitly when needed |
| Use `prisma-client-js` provider | Use `prisma-client` provider |
| Omit `output` in generator | Always specify `output` path |
| Import from `@prisma/client` | Import from generated path |
| Use `previewFeatures = ["driverAdapters"]` | Remove - driver adapters are now required |
| Create PrismaClient without adapter | Always pass a driver adapter |
