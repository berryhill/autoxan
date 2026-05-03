# Config Provider Pattern Guidelines

## Overview

When adding new configuration providers or service configurations (such as authentication providers, email services, payment gateways, etc.), follow this standardized pattern to ensure consistency and maintainability.

## Config Provider Pattern

### 1. Environment Variable Configuration

Always define environment variables in the config module:

```typescript
// app/src/config/env.ts
export const config = {
  // Group related configs together
  newService: {
    apiKey: env.NEW_SERVICE_API_KEY,
    apiSecret: env.NEW_SERVICE_API_SECRET,
    endpoint: env.NEW_SERVICE_ENDPOINT || 'https://api.example.com',
    enabled: env.NEW_SERVICE_ENABLED === 'true',
  },
};
```

### 2. Environment Variable Documentation

Update the `.env.example` file with new variables:

```bash
# .env.example
# New Service Configuration
NEW_SERVICE_API_KEY=your-api-key
NEW_SERVICE_API_SECRET=your-api-secret
NEW_SERVICE_ENDPOINT=https://api.example.com
NEW_SERVICE_ENABLED=true
```

### 3. Provider Implementation

Create a dedicated file for the provider:

```typescript
// app/src/lib/new-service.ts
import { config } from '@/config/env';

export const newServiceClient = createClient({
  apiKey: config.newService.apiKey,
  // ... other config
});

export async function performServiceAction() {
  if (!config.newService.enabled) {
    console.warn('New service is disabled');
    return;
  }
  // Implementation
}
```

### 4. Unit Tests for Config

Always test config validation:

```typescript
// app/src/config/env.test.ts
describe('newService config', () => {
  it('should have required environment variables', () => {
    // Test config loading
  });
});
```

## Key Principles

1. **Centralized Configuration**: All environment variables should be accessed through the config module, never directly via `process.env`

2. **Type Safety**: Use TypeScript types for configuration objects

3. **Default Values**: Provide sensible defaults where appropriate

4. **Validation**: Validate required configuration at startup

5. **Documentation**: Always update `.env.example` with new variables

6. **Secrets Management**: Never commit actual secrets; use environment variables

## Example: Adding an OAuth Provider

```typescript
// 1. Add to config/env.ts
export const config = {
  oauth: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    // Add new provider
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
};

// 2. Update .env.example
// GOOGLE_CLIENT_ID=your-google-client-id
// GOOGLE_CLIENT_SECRET=your-google-client-secret

// 3. Create provider in lib/auth.ts
// socialProviders: {
//   google: {
//     clientId: config.oauth.google.clientId,
//     clientSecret: config.oauth.google.clientSecret,
//   },
// },
```

## Checklist for Adding Config Providers

- [ ] Add environment variables to `app/src/config/env.ts`
- [ ] Update `app/.env.example` with new variables
- [ ] Update documentation in `docs/setup/environment-variables.md`
- [ ] Create or update provider implementation in `app/src/lib/`
- [ ] Add unit tests for config validation
- [ ] Verify provider works with missing optional config (graceful degradation)
