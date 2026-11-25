#!/usr/bin/env bash
# Kane-safe environment. Known landmines handled here.
#  - bracketed IPv6 entries in NO_PROXY crash Kane's httpx runner
#  - chrome-headless-shell breaks Kane ("Invalid port: ':1]'")
export KANE_CLI_USER_AGENT="${KANE_CLI_USER_AGENT:-gemini}"
_clean_proxy() {
  local v="$1"
  v="${v//\[::1\]/}"
  v="${v//\[::\]/}"
  printf '%s' "$v"
}
export NO_PROXY="$(_clean_proxy "${NO_PROXY:-}")"
export no_proxy="$(_clean_proxy "${no_proxy:-}")"
if [[ "${CHROME_BIN:-}" == *"headless-shell"* ]]; then
  unset CHROME_BIN
fi

# Antigravity CLI (agy) is not on the default PATH on every machine, so we
# probe the usual install locations instead of hardcoding one developer's
# home directory.
if [[ -z "${AGY_BIN:-}" ]]; then
  for CAND in \
    "$HOME/.gemini/bin/agy" \
    "$HOME/.gemini/bin/agy.exe" \
    "/c/Users/$USERNAME/.gemini/bin/agy.exe" \
    "/c/Users/$USERNAME/.gemini/bin/agy"; do
    if [[ -x "$CAND" ]]; then export AGY_BIN="$CAND"; break; fi
  done
  export AGY_BIN="${AGY_BIN:-agy}"
fi
