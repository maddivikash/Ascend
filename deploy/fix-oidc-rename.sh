#!/usr/bin/env bash
# The GitHub repo was renamed skill_sync_backend -> Ascend. The deploy role only trusted the old name,
# so GitHub Actions could no longer assume it. This adds the new name (keeps the old) and re-runs the deploy.
set -euo pipefail
ROLE=github-actions-deploy
TMP="$(mktemp)"
aws iam get-role --role-name "$ROLE" --query 'Role.AssumeRolePolicyDocument' --output json > "$TMP"
python3 - "$TMP" <<'PY'
import json, sys
p = sys.argv[1]; d = json.load(open(p)); key = "token.actions.githubusercontent.com:sub"
for st in d["Statement"]:
    cond = st.get("Condition", {}).get("StringLike", {})
    if key in cond:
        subs = cond[key] if isinstance(cond[key], list) else [cond[key]]
        for b in ("main", "master"):
            s = f"repo:maddivikash/Ascend:ref:refs/heads/{b}"
            if s not in subs: subs.append(s)
        cond[key] = subs
        print("trusted:", ", ".join(subs))
json.dump(d, open(p, "w"))
PY
aws iam update-assume-role-policy --role-name "$ROLE" --policy-document "file://$TMP"
rm -f "$TMP"
echo "Trust policy updated. Re-running the last deploy..."
RUN="$(gh run list --repo maddivikash/Ascend --workflow 'Deploy to EC2' --limit 1 --json databaseId -q '.[0].databaseId')"
gh run rerun "$RUN" --repo maddivikash/Ascend
echo "Watch: gh run watch $RUN --repo maddivikash/Ascend   or   https://github.com/maddivikash/Ascend/actions"
