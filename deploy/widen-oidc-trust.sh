#!/usr/bin/env bash
# Trust any workflow in the Ascend repo (any branch or environment), not only refs/heads/main.
# Still scoped to this one repository. Use when AssumeRoleWithWebIdentity says "Not authorized".
set -euo pipefail
ROLE=github-actions-deploy
ACCOUNT=720443382372
TRUST=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "arn:aws:iam::${ACCOUNT}:oidc-provider/token.actions.githubusercontent.com"},
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {"token.actions.githubusercontent.com:aud": "sts.amazonaws.com"},
      "StringLike": {"token.actions.githubusercontent.com:sub": ["repo:maddivikash/Ascend:*", "repo:maddivikash/skill_sync_backend:*"]}
    }
  }]
}
JSON
)
aws iam update-assume-role-policy --role-name "$ROLE" --policy-document "$TRUST"
echo "Trust now accepts any workflow from maddivikash/Ascend. Push to main (or re-run the failed workflow) to test."
