// Script to check all mindfulness services in proposals
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables from public/env-config.js
const envConfigPath = join(__dirname, '..', 'public', 'env-config.js');
let supabaseUrl, supabaseKey;

try {
  const envContent = readFileSync(envConfigPath, 'utf-8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL:\s*"([^"]+)"/);
  const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY:\s*"([^"]+)"/);
  if (urlMatch) supabaseUrl = urlMatch[1];
  if (keyMatch) supabaseKey = keyMatch[1];
} catch (error) {
  console.error('Error reading env-config.js:', error.message);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMindfulnessServices() {
  console.log('Checking all mindfulness services in proposals...\n');

  try {
    const { data: proposals, error } = await supabase
      .from('proposals')
      .select('*');

    if (error) throw error;

    console.log(`Found ${proposals.length} total proposals\n`);

    let mindfulnessCount = 0;
    const servicePrices = {};

    for (const proposal of proposals) {
      if (proposal.data && proposal.data.services) {
        for (const location in proposal.data.services) {
          for (const date in proposal.data.services[location]) {
            const dateData = proposal.data.services[location][date];
            if (dateData.services && Array.isArray(dateData.services)) {
              for (const service of dateData.services) {
                if (service.serviceType && service.serviceType.startsWith('mindfulness')) {
                  mindfulnessCount++;
                  const key = `${service.serviceType} - $${service.fixedPrice || 'N/A'}`;
                  servicePrices[key] = (servicePrices[key] || 0) + 1;

                  console.log(`Proposal ID: ${proposal.id}`);
                  console.log(`  Service: ${service.serviceType}`);
                  console.log(`  Price: $${service.fixedPrice || 'N/A'}`);
                  console.log(`  Class Length: ${service.classLength || 'N/A'} min`);
                  console.log('');
                }
              }
            }
          }
        }
      }
    }

    console.log('\n=================================');
    console.log('Summary:');
    console.log(`Total mindfulness services: ${mindfulnessCount}`);
    console.log('\nBreakdown by service type and price:');
    for (const [key, count] of Object.entries(servicePrices)) {
      console.log(`  ${key}: ${count} instances`);
    }
    console.log('=================================\n');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkMindfulnessServices();
