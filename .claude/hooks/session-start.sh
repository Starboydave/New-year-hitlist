#!/bin/bash
set -euo pipefail

# Only run in Claude Code cloud sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# 21st.dev CLI (idempotent). Auth: set API_KEY_21ST in the environment's
# secrets; the CLI reads it, so no interactive `21st login` is needed.
if ! command -v 21st >/dev/null 2>&1; then
  npm i -g @21st-dev/cli
fi
