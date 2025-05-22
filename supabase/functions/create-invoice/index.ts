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
    if (retries === 0) throw error;
    
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
      maxNetworkRetries: 3,
    });

    const { proposalData, customerId } = await req.json();

    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    if (!proposalData || !proposalData.services) {
      throw new Error('Invalid proposal data: services are required');
    }

    // Create line items from proposal data
    const lineItems = [];
    
    // Add services from each location
    Object.entries(proposalData.services).forEach(([location, locationData]: [string, any]) => {
      Object.entries(locationData).forEach(([date, dateData]: [string, any]) => {
        dateData.services.forEach((service: any) => {
          lineItems.push({
            description: `${service.serviceType} at ${location} on ${date}`,
            amount: Math.round(service.serviceCost * 100), // Convert to cents
            quantity: 1,
          });
        });
      });
    });

    if (lineItems.length === 0) {
      throw new Error('No services found in proposal data');
    }

    // Create and finalize invoice with retry logic
    const invoice = await retryWithBackoff(async () => {
      try {
        const inv = await stripe.invoices.create({
          customer: customerId,
          collection_method: 'send_invoice',
          days_until_due: 30,
          metadata: {
            proposalId: proposalData.id,
          },
        });

        // Add line items to the invoice
        for (const item of lineItems) {
          await stripe.invoiceItems.create({
            customer: inv.customer,
            invoice: inv.id,
            description: item.description,
            amount: item.amount,
            currency: 'usd',
          });
        }

        // Send the invoice
        return await stripe.invoices.sendInvoice(inv.id);
      } catch (stripeError) {
        console.error('Stripe API Error:', stripeError);
        throw new Error(`Stripe operation failed: ${stripeError.message}`);
      }
    });

    return new Response(
      JSON.stringify({ 
        invoiceId: invoice.id,
        invoiceUrl: invoice.hosted_invoice_url
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
    console.error('Error in create-invoice function:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred while creating the invoice';

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