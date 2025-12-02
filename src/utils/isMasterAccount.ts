import { User } from '@supabase/supabase-js';

const MASTER_ACCOUNT_EMAIL = 'will@getshortcut.co';

/**
 * Check if the current user is the master account
 * @param user - The current user object from Supabase auth
 * @returns true if the user is the master account, false otherwise
 */
export const isMasterAccount = (user: User | null): boolean => {
  if (!user || !user.email) {
    return false;
  }
  return user.email.toLowerCase() === MASTER_ACCOUNT_EMAIL.toLowerCase();
};

