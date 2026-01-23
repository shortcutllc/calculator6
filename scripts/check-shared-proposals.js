// Script to check shared proposals
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

async function checkSharedProposals() {
  try {
    // Check shared_proposals table
    console.log('Checking shared_proposals table...\n');
    const { data: sharedProposals, error: sharedError } = await supabase
      .from('shared_proposals')
      .select('*');

    if (sharedError) {
      console.log('shared_proposals table error:', sharedError.message);
    } else {
      console.log(`Found ${sharedProposals.length} shared proposals\n`);

      // Check for mindfulness services in shared proposals
      for (const shared of sharedProposals) {
        let hasMindfulness = false;

        if (shared.data && shared.data.services) {
          for (const location in shared.data.services) {
            for (const date in shared.data.services[location]) {
              const dateData = shared.data.services[location][date];
              if (dateData.services && Array.isArray(dateData.services)) {
                for (const service of dateData.services) {
                  if (service.serviceType && service.serviceType.startsWith('mindfulness')) {
                    hasMindfulness = true;
                    console.log(`Shared Proposal ID: ${shared.id}`);
                    console.log(`  Share Token: ${shared.share_token}`);
                    console.log(`  Service: ${service.serviceType}`);
                    console.log(`  Fixed Price: $${service.fixedPrice || 'N/A'}`);
                    console.log(`  Service Cost: $${service.serviceCost || 'N/A'}`);
                    console.log(`  Class Length: ${service.classLength || 'N/A'} min`);
                    console.log('');
                  }
                }
              }
            }
          }
        }
      }
    }

    // Also check proposal_shares table if it exists
    console.log('\nChecking proposal_shares table...\n');
    const { data: proposalShares, error: sharesError } = await supabase
      .from('proposal_shares')
      .select('*');

    if (sharesError) {
      console.log('proposal_shares table error:', sharesError.message);
    } else {
      console.log(`Found ${proposalShares.length} proposal shares`);
      console.log(JSON.stringify(proposalShares, null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSharedProposals();
