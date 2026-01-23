// Script to check all proposals that have share tokens
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

async function checkProposalsWithShares() {
  try {
    // Get all proposals
    const { data: proposals, error } = await supabase
      .from('proposals')
      .select('*')
      .not('share_token', 'is', null);

    if (error) throw error;

    console.log(`Found ${proposals.length} proposals with share tokens\n`);

    for (const proposal of proposals) {
      let hasMindfulness = false;
      const mindfulnessServices = [];

      if (proposal.data && proposal.data.services) {
        for (const location in proposal.data.services) {
          for (const date in proposal.data.services[location]) {
            const dateData = proposal.data.services[location][date];
            if (dateData.services && Array.isArray(dateData.services)) {
              for (const service of dateData.services) {
                if (service.serviceType && service.serviceType.startsWith('mindfulness')) {
                  hasMindfulness = true;
                  mindfulnessServices.push({
                    type: service.serviceType,
                    fixedPrice: service.fixedPrice,
                    serviceCost: service.serviceCost,
                    classLength: service.classLength
                  });
                }
              }
            }
          }
        }
      }

      if (hasMindfulness) {
        console.log(`Proposal ID: ${proposal.id}`);
        console.log(`Client: ${proposal.client_name}`);
        console.log(`Share Token: ${proposal.share_token}`);
        console.log(`Share URL: https://proposals.getshortcut.co/shared/${proposal.share_token}`);
        console.log(`Services:`);
        mindfulnessServices.forEach(s => {
          console.log(`  - ${s.type}`);
          console.log(`    Fixed Price: $${s.fixedPrice || 'N/A'}`);
          console.log(`    Service Cost: $${s.serviceCost || 'N/A'}`);
          console.log(`    Class Length: ${s.classLength || 'N/A'} min`);
        });
        console.log(`Grand Total: $${proposal.data?.grandTotal || 'N/A'}`);
        console.log('\n-----------------------------------\n');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkProposalsWithShares();
