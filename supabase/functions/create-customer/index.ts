/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

// @deno-types="npm:@types/stripe@13.7.0"
import Stripe from "npm:stripe@13.7.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  backoff = INITIAL_BACKOFF
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Operation failed (${MAX_RETRIES - retries + 1}/${MAX_RETRIES} attempts):`, error);
    
    if (retries === 0) throw error;
    
    console.log(`Retrying in ${backoff}ms...`);
    await new Promise(resolve => setTimeout(resolve, backoff));
    
    return retryWithBackoff(
      operation,
      retries - 1,
      backoff * 2
    );
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      throw new Error('Server configuration error: Missing Stripe key');
    }

    // Log request information
    console.log('Received request:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
    });

    const requestData = await req.json();
    console.log('Request data:', JSON.stringify(requestData, null, 2));

    const { proposalData } = requestData;
    
    if (!proposalData || !proposalData.clientName) {
      console.error('Invalid request data:', requestData);
      throw new Error('Invalid proposal data: client name is required');
    }

    // Initialize Stripe with explicit fetch configuration and increased retries
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 5,
      timeout: 30000,
    });

    console.log('Creating customer for:', proposalData.clientName);

    // Create customer with retry logic
    const customer = await retryWithBackoff(async () => {
      try {
        const result = await stripe.customers.create({
          name: proposalData.clientName,
          metadata: {
            proposalId: proposalData.id
          }
        });
        console.log('Customer created successfully:', result.id);
        return result;
      } catch (stripeError) {
        console.error('Stripe API Error:', {
          type: stripeError.type,
          message: stripeError.message,
          code: stripeError.code,
          decline_code: stripeError.decline_code,
        });
        throw new Error(`Stripe customer creation failed: ${stripeError.message}`);
      }
    });

    if (!customer || !customer.id) {
      console.error('Invalid customer response:', customer);
      throw new Error('Failed to create Stripe customer: Invalid response');
    }

    const response = {
      customerId: customer.id,
      customerName: customer.name
    };
    
    console.log('Sending successful response:', response);

    return new Response(
      JSON.stringify(response),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-customer function:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred while creating the customer';

    const errorResponse = {
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(errorResponse),
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