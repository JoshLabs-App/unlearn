#!/usr/bin/env bash
# 只读：打印 josh-apps 共享 Supabase 项目当前的 Auth 重定向配置，
# 用来确认 add-auth-redirect.sh 是不是真的生效了。不改任何东西。
set -euo pipefail

ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/05JoshMoney/.env.supabase"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" || -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "Need SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF (expected in $ENV_FILE)"
  exit 1
fi

CURRENT_JSON="$(curl -sS "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}")"

python3 - "$CURRENT_JSON" <<'PY'
import json, sys
d = json.loads(sys.argv[1])
print("site_url:", d.get("site_url"))
uri = d.get("uri_allow_list") or ""
print("uri_allow_list:")
for u in uri.split(","):
    u = u.strip()
    if u:
        print(" -", u)
PY
