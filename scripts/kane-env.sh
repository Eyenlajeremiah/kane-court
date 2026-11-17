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

# Antigravity CLI (agy) - not on the default PATH on this machine
export AGY_BIN="${AGY_BIN:-/c/Users/dell/.gemini/bin/agy.exe}"
