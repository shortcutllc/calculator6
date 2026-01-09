#!/usr/bin/env node

/**
 * Test script for survey completion Slack notification
 * Tests the proposal-event-notification Netlify function with survey_completed event type
 */

const FUNCTION_URL = process.argv[2] || 'https://proposals.getshortcut.co/.netlify/functions/proposal-event-notification';

const testData = {
  eventType: 'survey_completed',
  proposalId: 'test-proposal-123',
  clientName: 'Test Client Company',
  clientEmail: 'test@example.com',
  proposalType: 'event',
  totalCost: 5000.00,
  eventDates: ['2025-02-15', '2025-02-16'],
  locations: ['New York Office', 'Boston Office'],
  surveyResults: {
    table_or_chair_preference: 'Table',
    preferred_gender: 'No preference',
    office_address: JSON.stringify({
      'New York Office': '123 Main St, New York, NY 10001',
      'Boston Office': '456 Beacon St, Boston, MA 02115'
    }),
    massage_space_name: 'Wellness Room',
    point_of_contact: 'Jane Doe - jane@example.com',
    billing_contact: 'John Smith - john@example.com',
    coi_required: true
  }
};

console.log('🧪 Testing Survey Completion Slack Notification');
console.log('==============================================');
console.log('');
console.log(`Testing against: ${FUNCTION_URL}`);
console.log('');
console.log('Sending test data...');
console.log('');

fetch(FUNCTION_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
  .then(async (response) => {
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    console.log('Response Status:', response.status, response.statusText);
    console.log('');
    console.log('Response Body:');
    console.log(JSON.stringify(json, null, 2));
    console.log('');

    if (response.ok) {
      console.log('✅ Test passed! Notification sent successfully.');
      console.log('');
      console.log('Check your Slack channel to see if the notification was received.');
    } else {
      console.log('❌ Test failed. Check the response above for details.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Error sending test request:');
    console.error(error.message);
    if (error.message.includes('fetch')) {
      console.error('');
      console.error('Note: This script requires Node.js 18+ with native fetch support.');
      console.error('Or install node-fetch: npm install node-fetch');
    }
    process.exit(1);
  });
