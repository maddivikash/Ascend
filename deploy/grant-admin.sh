#!/usr/bin/env bash
# Grant (or revoke) the Ascend admin flag for an account, directly in the production database over SSM.
#   bash deploy/grant-admin.sh you@example.com          grant
#   bash deploy/grant-admin.sh you@example.com revoke   revoke
set -euo pipefail
EMAIL="${1:?email required}"; MODE="${2:-grant}"
FLAG=true; [ "$MODE" = "revoke" ] && FLAG=false
PSQL="cd /home/ec2-user/skillsync && docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db psql -U skillsync -d skillsync -At -c"
PARAMS=$(python3 -c 'import json,sys; psql,email,flag=sys.argv[1:]; print(json.dumps({"commands":[f"{psql} \"update users set is_admin = {flag} where lower(email) = lower(\x27{email}\x27)\"", f"{psql} \"select id, email, is_admin from users where is_admin order by id\""],"executionTimeout":["120"]}))' "$PSQL" "$EMAIL" "$FLAG")
CMD_ID=$(aws ssm send-command --region ap-south-1 --instance-ids i-0c8a6ad86684312c4 --document-name AWS-RunShellScript --comment "admin $MODE $EMAIL" --parameters "$PARAMS" --query Command.CommandId --output text)
sleep 8
aws ssm get-command-invocation --region ap-south-1 --command-id "$CMD_ID" --instance-id i-0c8a6ad86684312c4 --query '[Status,StandardOutputContent,StandardErrorContent]' --output text
echo "Admins listed above. Log out and back in on ascenddaily.in to pick up the change."
