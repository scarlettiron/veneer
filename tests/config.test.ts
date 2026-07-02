import { describe, expect, it } from 'vitest';

import { resolveConfig, type VeneerUserConfig } from '@veneer/core';

//A valid base config the tests can tweak.
const baseConfig: VeneerUserConfig = {
  database: { provider: 'postgres', connectionString: 'postgres://localhost/veneer' },
  auth: { provider: 'jwt', jwtSecret: 'a-secret-that-is-long-enough' },
};

describe('resolveConfig', () => {
  it('fills in the default values', () => {
    const resolved = resolveConfig(baseConfig);

    expect(resolved.mode).toBe('embedded');
    expect(resolved.apiBasePath).toBe('/api/veneer');
    expect(resolved.editInView).toBe(false);
    expect(resolved.auth.accessTtlSeconds).toBeGreaterThan(0);
    expect(resolved.auth.refreshTtlSeconds).toBeGreaterThan(resolved.auth.accessTtlSeconds);
    expect(resolved.auth.tokenStorage).toBe('cookie');
  });

  it('rejects a short jwt secret', () => {
    expect(() =>
      resolveConfig({ ...baseConfig, auth: { provider: 'jwt', jwtSecret: 'short' } }),
    ).toThrow();
  });

  it('rejects a database with no connection details', () => {
    expect(() =>
      resolveConfig({ ...baseConfig, database: { provider: 'postgres' } }),
    ).toThrow();
  });
});
