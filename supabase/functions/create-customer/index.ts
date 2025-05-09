import Stripe from "npm:stripe@13.7.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable');
    }

    // Initialize Stripe with explicit fetch configuration
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 3, // Add retries for network resilience
    });

    const { proposalData } = await req.json();
    
    if (!proposalData || !proposalData.client_name) {
      throw new Error('Invalid proposal data: client name is required');
    }

    // Create customer with error handling
    let customer;
    try {
      customer = await stripe.customers.create({
        name: proposalData.client_name,
        metadata: {
          proposalId: proposalData.id
        }
      });
    } catch (stripeError) {
      console.error('Stripe API Error:', stripeError);
      throw new Error(`Stripe customer creation failed: ${stripeError.message}`);
    }

    if (!customer || !customer.id) {
      throw new Error('Failed to create Stripe customer: Invalid response');
    }

    return new Response(
      JSON.stringify({ 
        customerId: customer.id,
        customerName: customer.name 
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-customer function:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred while creating the customer';

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});