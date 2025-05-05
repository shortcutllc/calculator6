import { supabase } from '../lib/supabaseClient';

export const verifyProposalAccess = async (
  proposalId: string,
  isShared: boolean = false
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('proposals')
      .select('user_id, is_editable')
      .eq('id', proposalId)
      .single();

    if (error || !data) {
      console.error('Error verifying proposal access:', error);
      return false;
    }

    // For shared proposals, check if editing is allowed
    if (isShared) {
      return data.is_editable;
    }

    // For non-shared proposals, verify user ownership
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id === data.user_id;
  } catch (error) {
    console.error('Error verifying proposal access:', error);
    return false;
  }
};