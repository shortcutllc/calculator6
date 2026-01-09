#!/bin/bash

# Test script for survey completion Slack notification
# This tests the proposal-event-notification Netlify function with survey_completed event type

echo "Testing Survey Completion Slack Notification..."
echo ""

# Sample survey data
SURVEY_DATA='{
  "eventType": "survey_completed",
  "proposalId": "test-proposal-123",
  "clientName": "Test Client Company",
  "clientEmail": "test@example.com",
  "proposalType": "event",
  "totalCost": 5000.00,
  "eventDates": ["2025-02-15", "2025-02-16"],
  "locations": ["New York Office", "Boston Office"],
  "surveyResults": {
    "table_or_chair_preference": "Table",
    "preferred_gender": "No preference",
    "office_address": "{\"New York Office\": \"123 Main St, New York, NY 10001\", \"Boston Office\": \"456 Beacon St, Boston, MA 02115\"}",
    "massage_space_name": "Wellness Room",
    "point_of_contact": "Jane Doe - jane@example.com",
    "billing_contact": "John Smith - john@example.com",
    "coi_required": true
  }
}'

# Test against local Netlify dev server (if running) or production
if [ -z "$1" ]; then
  URL="http://localhost:8888/.netlify/functions/proposal-event-notification"
  echo "Testing against local Netlify dev server: $URL"
else
  URL="$1"
  echo "Testing against: $URL"
fi

echo ""
echo "Sending request..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "$SURVEY_DATA")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""
echo "HTTP Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Test passed! Notification sent successfully."
else
  echo "❌ Test failed. Check the response above for details."
fi
