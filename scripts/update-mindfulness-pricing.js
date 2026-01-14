// Script to update mindfulness service pricing in existing proposals
// Updates mindfulness-soles from $1350 to $1250

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

  // Extract values from window.__ENV__ object
  const urlMatch = envContent.match(/VITE_SUPABASE_URL:\s*"([^"]+)"/);
  const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY:\s*"([^"]+)"/);

  if (urlMatch) supabaseUrl = urlMatch[1];
  if (keyMatch) supabaseKey = keyMatch[1];
} catch (error) {
  console.error('Error reading env-config.js:', error.message);
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in env-config.js');
  process.exit(1);
}

console.log('Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateMindfulnessPricing() {
  console.log('Starting mindfulness pricing update...\n');

  try {
    // Fetch all proposals
    const { data: proposals, error: fetchError } = await supabase
      .from('proposals')
      .select('*');

    if (fetchError) {
      throw new Error(`Error fetching proposals: ${fetchError.message}`);
    }

    console.log(`Found ${proposals.length} total proposals\n`);

    let updatedCount = 0;
    let servicesUpdatedCount = 0;

    for (const proposal of proposals) {
      let needsUpdate = false;
      const updatedData = { ...proposal.data };

      if (updatedData.services) {
        // Iterate through locations
        for (const location in updatedData.services) {
          // Iterate through dates
          for (const date in updatedData.services[location]) {
            const dateData = updatedData.services[location][date];

            // Check if there are services array
            if (dateData.services && Array.isArray(dateData.services)) {
              dateData.services = dateData.services.map(service => {
                let updated = false;
                const newService = { ...service };

                // Update mindfulness-soles: 30 min should be $1250
                if (service.serviceType === 'mindfulness-soles') {
                  if (!service.fixedPrice || service.fixedPrice !== 1250 || service.serviceCost !== 1250) {
                    console.log(`  - Updating mindfulness-soles in proposal ${proposal.id}: fixedPrice $${service.fixedPrice || 'N/A'} → $1250, serviceCost $${service.serviceCost || 'N/A'} → $1250`);
                    newService.fixedPrice = 1250;
                    newService.serviceCost = 1250;
                    newService.classLength = 30;
                    servicesUpdatedCount++;
                    needsUpdate = true;
                    updated = true;
                  }
                }

                // Update mindfulness-cle: 60 min should be $1500
                if (service.serviceType === 'mindfulness-cle' && (service.fixedPrice === 1350 || service.serviceCost === 1350)) {
                  console.log(`  - Updating mindfulness-cle in proposal ${proposal.id}: fixedPrice $${service.fixedPrice || 'N/A'} → $1500, serviceCost $${service.serviceCost || 'N/A'} → $1500`);
                  newService.fixedPrice = 1500;
                  newService.serviceCost = 1500;
                  servicesUpdatedCount++;
                  needsUpdate = true;
                  updated = true;
                }

                // Update base mindfulness: 40-45 min should be $1375
                if (service.serviceType === 'mindfulness' && service.classLength >= 40 && service.classLength <= 45 && (service.fixedPrice === 1350 || service.serviceCost === 1350)) {
                  console.log(`  - Updating mindfulness (${service.classLength} min) in proposal ${proposal.id}: fixedPrice $${service.fixedPrice || 'N/A'} → $1375, serviceCost $${service.serviceCost || 'N/A'} → $1375`);
                  newService.fixedPrice = 1375;
                  newService.serviceCost = 1375;
                  newService.classLength = 45;
                  servicesUpdatedCount++;
                  needsUpdate = true;
                  updated = true;
                }

                // Fix mindfulness-pro-reactivity if serviceCost is missing
                if (service.serviceType === 'mindfulness-pro-reactivity' && !service.serviceCost) {
                  console.log(`  - Fixing mindfulness-pro-reactivity serviceCost in proposal ${proposal.id}`);
                  const price = service.fixedPrice || 1375;
                  newService.serviceCost = price;
                  if (service.discountPercent > 0) {
                    newService.serviceCost = price * (1 - (service.discountPercent / 100));
                  }
                  servicesUpdatedCount++;
                  needsUpdate = true;
                  updated = true;
                }

                return newService;
              });

              // Recalculate totals for this date
              if (needsUpdate) {
                const totalCost = dateData.services.reduce((sum, service) => {
                  let serviceCost = 0;

                  if (service.serviceType === 'mindfulness' ||
                      service.serviceType === 'mindfulness-soles' ||
                      service.serviceType === 'mindfulness-movement' ||
                      service.serviceType === 'mindfulness-pro' ||
                      service.serviceType === 'mindfulness-cle' ||
                      service.serviceType === 'mindfulness-pro-reactivity') {
                    serviceCost = service.fixedPrice || 1350;
                  } else if (service.serviceType === 'headshot') {
                    const apptsPerHourPerPro = 60 / (service.appTime || 20);
                    const totalApptsPerHour = apptsPerHourPerPro * (service.numPros || 1);
                    const totalAppts = Math.floor((service.totalHours || 5) * totalApptsPerHour);
                    const proRevenue = (service.totalHours || 5) * (service.numPros || 1) * (service.proHourly || 400);
                    const retouchingTotal = totalAppts * (service.retouchingCost || 50);
                    serviceCost = proRevenue + retouchingTotal;
                  } else {
                    serviceCost = (service.totalHours || 4) * (service.hourlyRate || 135) * (service.numPros || 2);
                  }

                  if (service.discountPercent > 0) {
                    serviceCost = serviceCost * (1 - (service.discountPercent / 100));
                  }

                  return sum + serviceCost;
                }, 0);

                dateData.totalCost = totalCost;
              }
            }
          }
        }
      }

      // Update proposal if changes were made
      if (needsUpdate) {
        // Recalculate grand total
        let grandTotal = 0;
        if (updatedData.services) {
          for (const location in updatedData.services) {
            for (const date in updatedData.services[location]) {
              grandTotal += updatedData.services[location][date].totalCost || 0;
            }
          }
        }
        updatedData.grandTotal = grandTotal;

        // Update in database
        const { error: updateError } = await supabase
          .from('proposals')
          .update({ data: updatedData })
          .eq('id', proposal.id);

        if (updateError) {
          console.error(`Error updating proposal ${proposal.id}:`, updateError.message);
        } else {
          updatedCount++;
          console.log(`✓ Updated proposal ${proposal.id} - New grand total: $${grandTotal.toFixed(2)}\n`);
        }
      }
    }

    console.log('\n=================================');
    console.log('Migration complete!');
    console.log(`Total proposals updated: ${updatedCount}`);
    console.log(`Total services updated: ${servicesUpdatedCount}`);
    console.log('=================================\n');

  } catch (error) {
    console.error('Error during migration:', error.message);
    process.exit(1);
  }
}

// Run the migration
updateMindfulnessPricing();
