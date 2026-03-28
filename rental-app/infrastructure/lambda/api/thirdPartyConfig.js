'use strict';

const stripe = require('stripe');

const thirdParty = {
  publishableKey: '',
  webhookSecret: '',
  experianKey: '',
  experianSecret: ''
};

let stripeClient = null;
let thirdPartyReady = null;

/**
 * Load Stripe + Experian fields from Secrets Manager once per cold start (cached).
 * Falls back to env vars for local/tests.
 *
 * @param {import('aws-sdk').SecretsManager} secretsManager
 * @param {NodeJS.ProcessEnv} [env]
 */
async function ensureThirdPartyConfig(secretsManager, env = process.env) {
  if (!thirdPartyReady) {
    thirdPartyReady = (async () => {
      let fromSecret = {};
      const secretName = env.THIRD_PARTY_SECRET_NAME;
      if (secretName && secretsManager) {
        try {
          const result = await secretsManager
            .getSecretValue({ SecretId: secretName })
            .promise();
          fromSecret = JSON.parse(result.SecretString || '{}');
        } catch (err) {
          console.error('Failed to load THIRD_PARTY_SECRET_NAME:', err.message);
        }
      }
      const stripeKey =
        fromSecret.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY || '';
      stripeClient = stripe(stripeKey, {
        apiVersion: env.STRIPE_API_VERSION || '2023-10-16'
      });
      thirdParty.publishableKey =
        fromSecret.STRIPE_PUBLISHABLE_KEY || env.STRIPE_PUBLISHABLE_KEY || '';
      thirdParty.webhookSecret =
        fromSecret.STRIPE_WEBHOOK_SECRET || env.STRIPE_WEBHOOK_SECRET || '';
      thirdParty.experianKey =
        fromSecret.EXPERIAN_API_KEY || env.EXPERIAN_API_KEY || '';
      thirdParty.experianSecret =
        fromSecret.EXPERIAN_API_SECRET || env.EXPERIAN_API_SECRET || '';
    })();
  }
  await thirdPartyReady;
}

function getStripeClient() {
  return stripeClient;
}

/** @internal */
function resetThirdPartyConfigForTests() {
  thirdPartyReady = null;
  stripeClient = null;
  thirdParty.publishableKey = '';
  thirdParty.webhookSecret = '';
  thirdParty.experianKey = '';
  thirdParty.experianSecret = '';
}

module.exports = {
  ensureThirdPartyConfig,
  getStripeClient,
  thirdParty,
  resetThirdPartyConfigForTests
};
