#!/usr/bin/env bash
# verify-flow.sh – Integration test for Flow (Fresh People Command Center) deployment
#
# Tests:
#  1️⃣  Health endpoint (GET /)
#  2️⃣  Create a test event (POST /api/events) – confirms SQLite persistence via DB_PATH
#  3️⃣  List events (GET /api/events) – verifies the created event is stored
#  4️⃣  WhatsApp webhook verification (GET /webhook) – echo challenge
#  5️⃣  Mock inbound WhatsApp timesheet message (POST /webhook) – should return 200
#
# Before running, set DOMAIN and VERIFY_TOKEN below (or export them).
# Example:
#   export DOMAIN="https://flow.yourdomain.com"
#   export VERIFY_TOKEN="fresh_people_verify_token"
#   ./verify-flow.sh

set -euo pipefail

# ----- USER CONFIG -----
# Replace these values or export them in your shell before running the script.
: "${DOMAIN:?Please set DOMAIN env var, e.g. https://flow.yourdomain.com}"
: "${VERIFY_TOKEN:?Please set VERIFY_TOKEN env var, e.g. fresh_people_verify_token}"
# -----------------------

# Helper: pretty-print JSON if jq is available, otherwise output raw.
pretty() {
  if command -v jq >/dev/null 2>&1; then
    jq .
  else
    cat
  fi
}

echo "=== 1️⃣ Health check (GET /) ==="
curl -sSf "$DOMAIN/" | pretty
echo -e "\n"

echo "=== 2️⃣ Create a test event ==="
EVENT_PAYLOAD=$(cat <<EOF
{
  "id": "test-event-$(date +%s)",
  "title": "Verification Test Event",
  "date": "$(date -u +%Y-%m-%d)",
  "duration": 2,
  "staffName": "Test Staff",
  "dressCode": "All Black",
  "uniformType": "Formal All Black",
  "arrivalTime": "09:00",
  "staffPhone": "+27672961272",
  "staffEmail": "",
  "clientName": "Test Client",
  "clientPhone": "+27672961272",
  "clientEmail": "",
  "clientID": null,
  "clientBudget": 0,
  "miscExpenses": 0
}
EOF
)
CREATE_RESPONSE=$(curl -sSf -X POST "$DOMAIN/api/events" \
  -H "Content-Type: application/json" \
  -d "$EVENT_PAYLOAD")
echo "Create response:"
echo "$CREATE_RESPONSE" | pretty
echo -e "\n"

echo "=== 3️⃣ List events (GET /api/events) ==="
curl -sSf "$DOMAIN/api/events" | pretty
echo -e "\n"

echo "=== 4️⃣ WhatsApp webhook verification (GET /webhook) ==="
# Meta verification: hub.mode=subscribe&hub.challenge=<rand>&hub.verify_token=<your_token>
CHALLENGE="random_challenge_$(date +%s)"
VERIFY_URL="$DOMAIN/webhook?hub.mode=subscribe&hub.challenge=$CHALLENGE&hub.verify_token=$VERIFY_TOKEN"
VERIFY_RESPONSE=$(curl -sSf "$VERIFY_URL")
echo "Verification response (should echo the challenge):"
echo "$VERIFY_RESPONSE"
echo -e "\nExpected: $CHALLENGE\n"

echo "=== 5️⃣ Mock inbound WhatsApp timesheet message (POST /webhook) ==="
# Minimal WhatsApp Cloud API payload for an inbound text message (could be a timesheet keyword)
INBOUND_PAYLOAD=$(cat <<EOF
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "1234567890",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15551234567",
              "phone_number_id": "9876543210"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Test User"
                },
                "wa_id": "27672961272"
              }
            ],
            "messages": [
              {
                "from": "27672961272",
                "id": "wamid.HBgM",
                "timestamp": "$(date +%s)",
                "text": {
                  "body": "Timesheet"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
EOF
)
INBOUND_RESPONSE=$(curl -sSf -X POST "$DOMAIN/webhook" \
  -H "Content-Type: application/json" \
  -d "$INBOUND_PAYLOAD")
echo "Inbound webhook response:"
echo "$INBOUND_RESPONSE" | pretty
echo -e "\n"

echo "=== Verification complete ==="
echo "If all steps succeeded, your Flow deployment is healthy."
echo "Check that the created event appears in the list and persists after a redeploy."