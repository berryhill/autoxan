# Unit Testing Guidelines

## Critical Rules for Unit Tests

1. **NEVER use environment variables in unit tests**
   - Unit tests must be self-contained
   - Mock all environment-dependent values
   - Use test fixtures and constants

2. **NEVER call upstream services in unit tests**
   - No database connections
   - No API calls to external services
   - No network requests
   - No file system operations on production paths

3. **ALWAYS mock external dependencies**
   - Mock database calls using vi.mock() or similar
   - Mock API clients and SDK calls
   - Use dependency injection for testability
   - Create mock implementations for external services

4. **Unit test structure**
   ```typescript
   // CORRECT - Unit test with mocks
   import { describe, it, expect, vi } from 'vitest';
   
   // Mock external dependencies BEFORE importing the module
   vi.mock('@/lib/db', () => ({
     prisma: {
       user: {
         findMany: vi.fn().mockResolvedValue([]),
       },
     },
   }));
   
   describe('MyService', () => {
     it('should do something', () => {
       // Test with mocked data only
       expect(true).toBe(true);
     });
   });
   ```

5. **Test types in this project**
   - **Unit tests** (`*.test.ts`): Test individual functions/components in isolation
   - **Integration tests** (future): Test database operations with test database
   - **E2E tests** (future): Test full user flows with real services

## CI/CD Testing Pipeline

1. **Unit tests run WITHOUT:**
   - DATABASE_URL environment variable
   - Any database connections
   - Any external service connections
   - Prisma Client generation (unless explicitly needed)

2. **CI workflow should NOT:**
   - Run `prisma generate` for unit tests
   - Require database access
   - Set production environment variables

## Test File Organization

```
app/src/
├── lib/
│   ├── db.ts           # Actual database client
│   ├── db.test.ts      # Unit tests (mocked db)
│   ├── auth.ts         # Auth implementation
│   └── auth.test.ts    # Unit tests (mocked auth)
├── config/
│   ├── env.ts          # Environment config
│   └── env.test.ts     # Unit tests (mocked env)
```

## Summary

| ❌ DON'T | ✅ DO INSTEAD |
|----------|---------------|
| Use real DATABASE_URL in unit tests | Mock database calls |
| Call external APIs in unit tests | Mock API clients |
| Require env vars for unit tests | Use test fixtures/mocks |
| Connect to real databases | Use vi.mock() for Prisma |
| Make network requests | Mock HTTP clients |
