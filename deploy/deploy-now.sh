#!/usr/bin/env bash
# Deploy a branch to the EC2 box right now from this machine, via SSM (no GitHub Actions needed).
#   bash deploy/deploy-now.sh [branch]     default: main
# Uses the local AWS CLI credentials (user skillsync-cli, account 720443382372).
set -euo pipefail
BRANCH="${1:-main}"
INSTANCE_ID=i-0c8a6ad86684312c4
REGION=ap-south-1
# The deploy script is fetched from the branch that has the renamed-repo fix, and told which branch to deploy.
SCRIPT_URL="https://raw.githubusercontent.com/maddivikash/Ascend/feature/public-blog/deploy/ec2-deploy-branch.sh"
echo "Deploying branch '$BRANCH' to $INSTANCE_ID ..."
CMD_ID=$(aws ssm send-command --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --comment "manual deploy $BRANCH" \
  --parameters "{\"commands\":[\"curl -sL $SCRIPT_URL | bash -s -- $BRANCH\"],\"executionTimeout\":[\"900\"]}" \
  --query Command.CommandId --output text)
echo "SSM command $CMD_ID; waiting (container rebuild takes a few minutes) ..."
STATUS=Pending
for i in $(seq 1 90); do
  STATUS=$(aws ssm get-command-invocation --region "$REGION" --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" --query Status --output text 2>/dev/null || echo Pending)
  case "$STATUS" in Success|Failed|Cancelled|TimedOut) break ;; esac
  sleep 10
done
echo "Status: $STATUS"
aws ssm get-command-invocation --region "$REGION" --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" --query StandardOutputContent --output text | tail -25
if [ "$STATUS" != "Success" ]; then
  aws ssm get-command-invocation --region "$REGION" --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" --query StandardErrorContent --output text | tail -25
  exit 1
fi
echo "Health: $(curl -s https://ascenddaily.in/api/health)"
echo "Admin API: HTTP $(curl -s -o /dev/null -w '%{http_code}' https://ascenddaily.in/api/ops-4f8a/overview) (401 means it is live and asking for login)"
