#!/bin/bash

# Test script for Slack notification function
# This tests all three event types: view, changes_submitted, and approved

FUNCTION_URL="https://proposals.getshortcut.co/.netlify/functions/proposal-event-notification"

echo "🧪 Testing Slack Notification Function"
echo "======================================"
echo ""

# Test 1: View Event
echo "Test 1: Testing VIEW event..."
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "view",
    "proposalId": "test-proposal-123",
    "clientName": "Test Client Company",
    "clientEmail": "test@example.com",
    "proposalType": "event",
    "totalCost": 5250,
    "eventDates": ["2024-01-15", "2024-01-16", "2024-01-17"],
    "locations": ["New York Office", "Boston Office"]
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

# Wait 2 seconds before next test
sleep 2

# Test 2: Changes Submitted Event
echo "Test 2: Testing CHANGES_SUBMITTED event..."
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "changes_submitted",
    "proposalId": "test-proposal-123",
    "clientName": "Test Client Company",
    "clientEmail": "test@example.com",
    "proposalType": "event",
    "totalCost": 5250,
    "eventDates": ["2024-01-15", "2024-01-16"],
    "locations": ["New York Office"]
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

# Wait 2 seconds before next test
sleep 2

# Test 3: Approved Event
echo "Test 3: Testing APPROVED event..."
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "approved",
    "proposalId": "test-proposal-123",
    "clientName": "Test Client Company",
    "clientEmail": "test@example.com",
    "proposalType": "mindfulness-program",
    "totalCost": 12500,
    "eventDates": ["2024-01-15", "2024-01-22", "2024-01-29", "2024-02-05"],
    "locations": []
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

echo "✅ All tests completed!"
echo ""
echo "Check your Slack channel to see if notifications were received."
echo "If you see HTTP Status: 200, the function is working correctly."
