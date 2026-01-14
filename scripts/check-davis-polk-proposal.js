// Script to check Davis Polk proposal specifically
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

async function checkProposal() {
  try {
    // Look for Davis Polk proposal
    const { data: proposals, error } = await supabase
      .from('proposals')
      .select('*')
      .ilike('client_name', '%davis%polk%');

    if (error) throw error;

    console.log(`Found ${proposals.length} Davis Polk proposals:\n`);

    for (const proposal of proposals) {
      console.log(`\nProposal ID: ${proposal.id}`);
      console.log(`Client: ${proposal.client_name}`);
      console.log(`Created: ${proposal.created_at}`);

      if (proposal.data && proposal.data.services) {
        console.log('\nServices:');
        for (const location in proposal.data.services) {
          for (const date in proposal.data.services[location]) {
            const dateData = proposal.data.services[location][date];
            if (dateData.services && Array.isArray(dateData.services)) {
              dateData.services.forEach((service, idx) => {
                console.log(`  ${idx + 1}. ${service.serviceType}`);
                console.log(`     Price: $${service.fixedPrice || service.serviceCost || 'N/A'}`);
                console.log(`     Service Cost: $${service.serviceCost || 'N/A'}`);
                console.log(`     Class Length: ${service.classLength || 'N/A'} min`);
              });
            }
          }
        }
      }

      console.log(`\nGrand Total: $${proposal.data?.grandTotal || 'N/A'}`);
      console.log('\n-----------------------------------');
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkProposal();
