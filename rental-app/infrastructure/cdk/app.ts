#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from 'path';
import { EzCarRentalInfrastructureStack } from './stacks/infrastructure-stack';

const app = new cdk.App();

const environment = app.node.tryGetContext('environment') || 'dev';

const envConfigPath = path.resolve(__dirname, '..', '..', '..', 'infra', 'environments.json');
let account: string | undefined;
let region: string | undefined;

if (fs.existsSync(envConfigPath)) {
  const envs = JSON.parse(fs.readFileSync(envConfigPath, 'utf-8'));
  const cfg = envs[environment] ?? {};
  account = cfg.account || process.env.CDK_DEFAULT_ACCOUNT;
  region = cfg.region || process.env.CDK_DEFAULT_REGION;
} else {
  account = process.env.CDK_DEFAULT_ACCOUNT;
  region = process.env.CDK_DEFAULT_REGION;
}

new EzCarRentalInfrastructureStack(app, `EzCarRental-${environment}`, {
  env: { account, region },
  environment,
});

cdk.Tags.of(app).add('Project', 'AICarRental');
cdk.Tags.of(app).add('Environment', environment);
cdk.Tags.of(app).add('Component', 'Rental');
