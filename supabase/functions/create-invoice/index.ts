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

    // Create invoice with error handling
    let invoice;
    try {
      invoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: 'send_invoice',
        days_until_due: 30,
        metadata: {
          proposalId: proposalData.id,
        },
      });
    } catch (stripeError) {
      console.error('Stripe Invoice Creation Error:', stripeError);
      throw new Error(`Failed to create invoice: ${stripeError.message}`);
    }

    // Add line items to the invoice with error handling
    try {
      for (const item of lineItems) {
        await stripe.invoiceItems.create({
          customer: invoice.customer,
          invoice: invoice.id,
          description: item.description,
          amount: item.amount,
          currency: 'usd',
        });
      }
    } catch (stripeError) {
      console.error('Stripe Invoice Items Error:', stripeError);
      throw new Error(`Failed to add items to invoice: ${stripeError.message}`);
    }

    // Send the invoice with error handling
    let finalizedInvoice;
    try {
      finalizedInvoice = await stripe.invoices.sendInvoice(invoice.id);
    } catch (stripeError) {
      console.error('Stripe Send Invoice Error:', stripeError);
      throw new Error(`Failed to send invoice: ${stripeError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        invoiceId: finalizedInvoice.id,
        invoiceUrl: finalizedInvoice.hosted_invoice_url
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