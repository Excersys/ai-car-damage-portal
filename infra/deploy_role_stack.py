"""
Standalone CDK stack that creates a deploy role in the target account.

Deploy once per account:
    cdk deploy --app "python deploy_role_stack.py" --context environment=prod

The role trusts:
  1. The dev/CI AWS account (for cross-account CDK deploys)
  2. The GitHub OIDC provider (when you switch from static keys)

Switching from static IAM keys to GitHub OIDC only requires updating the
trust policy -- no restructuring needed.
"""

from __future__ import annotations

import json
from pathlib import Path

import aws_cdk as cdk
from aws_cdk import aws_iam as iam
from constructs import Construct


class CdkDeployRoleStack(cdk.Stack):
    """IAM role assumed by CI/CD to deploy CDK stacks into this account."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        env_name: str,
        trusted_account_id: str | None = None,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        principals: list[iam.IPrincipal] = []

        if trusted_account_id:
            principals.append(iam.AccountPrincipal(trusted_account_id))

        trust = (
            iam.CompositePrincipal(*principals)
            if principals
            else iam.AccountRootPrincipal()
        )

        self.deploy_role = iam.Role(
            self,
            "CdkDeployRole",
            role_name=f"acr-cdk-deploy-{env_name}",
            assumed_by=trust,
            max_session_duration=cdk.Duration.hours(1),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name("AdministratorAccess"),
            ],
            description=(
                f"Role assumed by CI to deploy ACR CDK stacks ({env_name}). "
                "Scoped to AdministratorAccess for CDK; tighten when OIDC is enabled."
            ),
        )

        cdk.CfnOutput(
            self,
            "DeployRoleArn",
            value=self.deploy_role.role_arn,
            description="ARN to pass as --role-arn to cdk deploy",
        )


app = cdk.App()

env_name = app.node.try_get_context("environment") or "dev"

_ENV_CFG_PATH = Path(__file__).resolve().parent / "environments.json"
if _ENV_CFG_PATH.exists():
    _envs = json.loads(_ENV_CFG_PATH.read_text())
    _cfg = _envs.get(env_name, {})
    account = _cfg.get("account")
    region = _cfg.get("region") or "us-east-1"
    dev_cfg = _envs.get("dev", {})
    trusted_account = dev_cfg.get("account") if env_name != "dev" else None
else:
    account = None
    region = "us-east-1"
    trusted_account = None

CdkDeployRoleStack(
    app,
    f"AcrCdkDeployRole-{env_name}",
    env_name=env_name,
    trusted_account_id=trusted_account,
    env=cdk.Environment(account=account, region=region),
)

cdk.Tags.of(app).add("Project", "AICarRental")
cdk.Tags.of(app).add("Environment", env_name)
cdk.Tags.of(app).add("ManagedBy", "CDK")

app.synth()
