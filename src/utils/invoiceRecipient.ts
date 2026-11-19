import { supabase } from '../lib/supabaseClient';
import { invoiceRecipient } from '../../netlify/functions/lib/invoice-defaults.js';
import type { InvoiceRecipient } from '../../netlify/functions/lib/invoice-defaults.js';

export interface LoadedInvoiceRecipient extends InvoiceRecipient {
  /** The survey's billing contact answer as the client wrote it, for staff to check against. */
  billingContactText: string | null;
}

interface ProposalContactRow {
  client_name?: string | null;
  client_email?: string | null;
  customization?: { contactFirstName?: string; contactLastName?: string } | null;
  data?: { clientName?: string } | null;
}

/**
 * Who a proposal's invoice goes to: the person on the pre-event survey's
 * billing contact, else the proposal's contact, read fresh from the database
 * (proposals.client_name is usually the company and client_email is mostly
 * empty, so neither is enough on its own). Pass the proposal row when it is
 * already loaded. Never throws: on a failed read it falls back to the row.
 */
export async function loadInvoiceRecipient(
  proposalId: string,
  row?: ProposalContactRow | null
): Promise<LoadedInvoiceRecipient> {
  const [proposalRes, surveyRes] = await Promise.all([
    row
      ? Promise.resolve({ data: row })
      : supabase
          .from('proposals')
          .select('client_name, client_email, customization, data')
          .eq('id', proposalId)
          .maybeSingle(),
    supabase
      .from('proposal_survey_responses')
      .select('billing_contact, point_of_contact')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: false })
      .limit(1),
  ]).catch(() => [{ data: row || null }, { data: null }] as const);

  const proposal = (proposalRes?.data || null) as ProposalContactRow | null;
  const survey = (Array.isArray(surveyRes?.data) ? surveyRes.data[0] : null) as
    | { billing_contact?: string | null; point_of_contact?: string | null }
    | null;

  const recipient = invoiceRecipient({
    companyName: proposal?.data?.clientName || proposal?.client_name,
    customization: proposal?.customization,
    clientEmail: proposal?.client_email,
    billingContact: survey?.billing_contact,
    pointOfContact: survey?.point_of_contact,
  });
  const billingContactText = survey?.billing_contact?.trim() || null;
  return { ...recipient, billingContactText };
}
