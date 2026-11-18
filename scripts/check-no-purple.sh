#!/usr/bin/env bash
# scripts/check-no-purple.sh
# Verifies that no purple/violet/indigo hex codes or Tailwind classes exist in client source code.

set -e

echo "Running purple check across client/src/..."

# Prohibited patterns:
# - purple, violet, indigo in classes
# - typical purple hex codes (#8, #7, #9, #a, #6 with purple hues)
FORBIDDEN_CLASSES="purple|violet|indigo"

VIOLATIONS=$(grep -rnE --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \
  "text-(${FORBIDDEN_CLASSES})|bg-(${FORBIDDEN_CLASSES})|border-(${FORBIDDEN_CLASSES})|from-(${FORBIDDEN_CLASSES})|to-(${FORBIDDEN_CLASSES})" \
  client/src/ || true)

if [ -n "$VIOLATIONS" ]; then
  echo "FAIL: Found prohibited purple/violet/indigo classes in client/src/:"
  echo "$VIOLATIONS"
  exit 1
fi

echo "PASS: Zero purple/violet/indigo classes detected in client/src/."
