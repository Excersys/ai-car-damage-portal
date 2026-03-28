'use strict';

const {
  ensureThirdPartyConfig,
  getStripeClient,
  thirdParty,
  resetThirdPartyConfigForTests
} = require('./thirdPartyConfig');

describe('thirdPartyConfig', () => {
  const baseEnv = {
    STRIPE_API_VERSION: '2023-10-16'
  };

  beforeEach(() => {
    resetThirdPartyConfigForTests();
    jest.clearAllMocks();
  });

  test('loads from Secrets Manager when THIRD_PARTY_SECRET_NAME is set', async () => {
    const env = {
      ...baseEnv,
      THIRD_PARTY_SECRET_NAME: 'acr/staging/third-party-keys'
    };
    const mockSm = {
      getSecretValue: jest.fn().mockReturnValue({
        promise: () =>
          Promise.resolve({
            SecretString: JSON.stringify({
              STRIPE_SECRET_KEY: 'sk_test_abc',
              STRIPE_PUBLISHABLE_KEY: 'pk_test_xyz',
              STRIPE_WEBHOOK_SECRET: 'whsec_1',
              EXPERIAN_API_KEY: 'ek',
              EXPERIAN_API_SECRET: 'es'
            })
          })
      })
    };

    await ensureThirdPartyConfig(mockSm, env);

    expect(mockSm.getSecretValue).toHaveBeenCalledWith({
      SecretId: 'acr/staging/third-party-keys'
    });
    expect(thirdParty.publishableKey).toBe('pk_test_xyz');
    expect(thirdParty.webhookSecret).toBe('whsec_1');
    expect(thirdParty.experianKey).toBe('ek');
    expect(thirdParty.experianSecret).toBe('es');
    expect(getStripeClient()).toBeTruthy();
  });

  test('falls back to env when no secret name', async () => {
    const env = {
      ...baseEnv,
      STRIPE_SECRET_KEY: 'sk_env',
      STRIPE_PUBLISHABLE_KEY: 'pk_env',
      STRIPE_WEBHOOK_SECRET: 'wh_env',
      EXPERIAN_API_KEY: 'e1',
      EXPERIAN_API_SECRET: 'e2'
    };

    await ensureThirdPartyConfig(null, env);

    expect(getStripeClient()).toBeTruthy();
    expect(thirdParty.publishableKey).toBe('pk_env');
    expect(thirdParty.webhookSecret).toBe('wh_env');
    expect(thirdParty.experianKey).toBe('e1');
    expect(thirdParty.experianSecret).toBe('e2');
  });

  test('on Secrets Manager failure, continues with empty secret fields', async () => {
    const env = {
      ...baseEnv,
      THIRD_PARTY_SECRET_NAME: 'missing'
    };
    const mockSm = {
      getSecretValue: jest.fn().mockReturnValue({
        promise: () => Promise.reject(new Error('ResourceNotFoundException'))
      })
    };

    await ensureThirdPartyConfig(mockSm, env);

    expect(getStripeClient()).toBeTruthy();
    expect(thirdParty.publishableKey).toBe('');
  });

  test('caches: single getSecretValue across repeated ensure calls', async () => {
    const env = {
      ...baseEnv,
      THIRD_PARTY_SECRET_NAME: 'one-secret'
    };
    const mockSm = {
      getSecretValue: jest.fn().mockReturnValue({
        promise: () =>
          Promise.resolve({
            SecretString: JSON.stringify({ STRIPE_SECRET_KEY: 'sk_1' })
          })
      })
    };

    await ensureThirdPartyConfig(mockSm, env);
    await ensureThirdPartyConfig(mockSm, env);

    expect(mockSm.getSecretValue).toHaveBeenCalledTimes(1);
  });

  test('prefers secret JSON over env for overlapping keys', async () => {
    const env = {
      ...baseEnv,
      THIRD_PARTY_SECRET_NAME: 's',
      STRIPE_PUBLISHABLE_KEY: 'pk_from_env'
    };
    const mockSm = {
      getSecretValue: jest.fn().mockReturnValue({
        promise: () =>
          Promise.resolve({
            SecretString: JSON.stringify({
              STRIPE_SECRET_KEY: 'sk_from_sm',
              STRIPE_PUBLISHABLE_KEY: 'pk_from_sm'
            })
          })
      })
    };

    await ensureThirdPartyConfig(mockSm, env);

    expect(thirdParty.publishableKey).toBe('pk_from_sm');
    expect(getStripeClient()).toBeTruthy();
  });
});
