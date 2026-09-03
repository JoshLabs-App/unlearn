#!/usr/bin/env bash
# 把 English Game 的地址加进 josh-apps 共享 Supabase 项目的 Auth 重定向白名单，
# 只追加、不覆盖别的 app（AskBible/JoshMoney/Selah）已经登记的地址。
# 需要在 05JoshMoney/.env.supabase 里的 SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF。
#
# 用法：
#   bash "01ENGLISH GAME/scripts/add-auth-redirect.sh"
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

NEW_URIS=(
  "https://joshlabs.app/english-game/**"
  "https://unlearn-eng.pages.dev/**"
  "http://localhost:8734/**"
)

echo "→ Reading current Auth redirect allow-list…"
CURRENT_JSON="$(curl -sS "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}")"

MERGED_JSON="$(python3 - "$CURRENT_JSON" "${NEW_URIS[@]}" <<'PY'
import json, sys
current = json.loads(sys.argv[1])
new_uris = sys.argv[2:]
existing = [u.strip() for u in (current.get("uri_allow_list") or "").split(",") if u.strip()]
for u in new_uris:
    if u not in existing:
        existing.append(u)
print(json.dumps({"uri_allow_list": ",".join(existing)}))
PY
)"

echo "→ Merged list will be:"
python3 -c "import json,sys; print('\n'.join(' - ' + u for u in json.loads(sys.argv[1])['uri_allow_list'].split(',')))" "$MERGED_JSON"

echo "→ Applying (PATCH /config/auth)…"
RESP="$(curl -sS -w "\n%{http_code}" -X PATCH \
  "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$MERGED_JSON")"
CODE="$(echo "$RESP" | tail -n1)"
OUT="$(echo "$RESP" | sed '$d')"
if [[ "$CODE" != "200" && "$CODE" != "201" ]]; then
  echo "Failed HTTP $CODE"
  echo "$OUT" | head -c 800
  echo
  exit 1
fi
echo "  ok"
echo "Done. Also enable the Google provider for this project in the Supabase Dashboard if you haven't already."
