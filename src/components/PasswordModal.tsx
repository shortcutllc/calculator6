import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from './LoadingSpinner';

interface PasswordModalProps {
  proposalId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({ proposalId, onSuccess, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: verifyError } = await supabase
        .from('proposals')
        .select('id')
        .eq('id', proposalId)
        .eq('password', password)
        .single();

      if (verifyError || !data) {
        setError('Invalid password');
        return;
      }

      onSuccess();
    } catch (err) {
      setError('Failed to verify password');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-xl max-w-md w-full">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-[#175071] p-3 rounded-full">
            <Lock className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-semibold text-center text-[#175071] mb-2">
          Password Protected Proposal
        </h2>
        
        <p className="text-gray-600 text-center mb-6">
          This proposal is password protected. Please enter the password to view it.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#175071]"
              placeholder="Enter password"
              disabled={loading}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#175071] text-white rounded-md hover:bg-[#134660] focus:outline-none focus:ring-2 focus:ring-[#175071] focus:ring-offset-2 flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="small" className="mr-2" />
                  Verifying...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordModal