import { supabase } from '../src/lib/supabaseClient';
import fs from 'fs/promises';
import path from 'path';

async function generateProposalPages() {
  try {
    // Fetch all proposals
    const { data: proposals, error } = await supabase
      .from('proposals')
      .select('*');

    if (error) throw error;

    // Create proposals directory
    const proposalsDir = path.join(process.cwd(), 'proposals');
    await fs.mkdir(proposalsDir, { recursive: true });

    // Generate static files for each proposal
    for (const proposal of proposals) {
      const proposalPath = path.join(proposalsDir, `${proposal.id}.json`);
      await fs.writeFile(proposalPath, JSON.stringify(proposal));
    }

    console.log(`Generated ${proposals.length} proposal pages`);
  } catch (error) {
    console.error('Error generating proposal pages:', error);
    process.exit(1);
  }
}

generateProposalPages();