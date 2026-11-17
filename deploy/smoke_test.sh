#!/usr/bin/env bash

# Production Smoke Test Script for CampusAI Assistant
# Usage: ./deploy/smoke_test.sh [TARGET_URL]
# Defaults to http://localhost:5000 if not provided.

TARGET_URL="${1:-http://localhost:5000}"
echo "========================================================="
echo "   CampusAI Assistant - Production Smoke Test Suite"
echo "   Target Base URL: $TARGET_URL"
echo "========================================================="

PASSED=0
FAILED=0

run_check() {
  local NAME="$1"
  local ENDPOINT="$2"
  local METHOD="$3"
  local DATA="$4"
  local EXPECTED="$5"

  echo -n "[TEST] $NAME... "
  
  if [ "$METHOD" = "POST" ]; then
    RESPONSE=$(curl -s -X POST "$TARGET_URL$ENDPOINT" \
      -H "Content-Type: application/json" \
      -d "$DATA" 2>/dev/null)
  else
    RESPONSE=$(curl -s "$TARGET_URL$ENDPOINT" 2>/dev/null)
  fi

  if echo "$RESPONSE" | grep -q "$EXPECTED"; then
    echo "PASSED ✅"
    PASSED=$((PASSED + 1))
  else
    echo "FAILED ❌"
    echo "  Expected to find: $EXPECTED"
    echo "  Actual Response: $(echo "$RESPONSE" | head -c 200)"
    FAILED=$((FAILED + 1))
  fi
}

echo ""
# 1. Healthcheck
run_check "1. Gateway Healthcheck" "/health" "GET" "" "status"

# 2. English Query
run_check "2. English Inquiry (Exam Form)" "/api/chat" "POST" \
  '{"query": "When is the last date to submit the exam form?", "sessionId": "smoke_test_en"}' \
  "answer"

# 3. Hindi Query
run_check "3. Hindi Inquiry (Hostel Rules)" "/api/chat" "POST" \
  '{"query": "हॉस्टल में मेस का खाना और नियम क्या हैं?", "sessionId": "smoke_test_hi"}' \
  "answer"

# 4. Gujarati / Gujlish Query
run_check "4. Gujlish Code-Mixed (Admission Fees)" "/api/chat" "POST" \
  '{"query": "College ma admission mate ketli fees chhe?", "sessionId": "smoke_test_gu"}' \
  "answer"

# 5. Telegram Bot Channel Status
run_check "5. Telegram Bot Channel Status" "/api/telegram/status" "GET" "" "telegram"

echo ""
echo "========================================================="
echo "Smoke Test Summary: $PASSED Passed, $FAILED Failed"
if [ $FAILED -eq 0 ]; then
  echo "All production smoke tests passed successfully! 🎉"
  exit 0
else
  echo "Some smoke tests failed. Please inspect logs. ⚠️"
  exit 1
fi

