import { supabase } from '../../lib/supabaseClient';
import { z } from 'zod';

const proposalSchema = z.object({
  id: z.string().uuid(),
  shared: z.boolean().optional()
});

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);
    const { id, shared } = proposalSchema.parse(params);

    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Proposal not found');

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': shared ? 'public, max-age=60' : 'private, no-cache'
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }
}