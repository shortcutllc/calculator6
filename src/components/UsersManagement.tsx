import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Key, RefreshCw, AlertCircle, CheckCircle, X, Mail, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { isMasterAccount } from '../utils/isMasterAccount';
import { LoadingSpinner } from './LoadingSpinner';

interface User {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  phone: string | null;
  confirmed_at: string | null;
}

const UsersManagement: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Invite user modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  
  // Reset password modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Delete user modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Check if user is master account
  const isMaster = isMasterAccount(user);

  useEffect(() => {
    if (!isMaster) {
      setError('Access denied. Master account required.');
      setLoading(false);
      return;
    }
    fetchUsers();
  }, [isMaster]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the list-users edge function
      const { data, error: fetchError } = await supabase.functions.invoke('list-users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('List users response:', { data, fetchError });

      if (fetchError) {
        console.error('Function invocation error:', fetchError);
        throw fetchError;
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        throw new Error(data.error);
      }

      console.log('Users data:', data?.users);
      setUsers(data?.users || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail) {
      setError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    // If password is provided, validate it
    if (invitePassword && invitePassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setInviteLoading(true);
      setError(null);
      setSuccess(null);

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the invite-user edge function
      const { data, error: inviteError } = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteEmail,
          password: invitePassword || undefined,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (inviteError) {
        throw inviteError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSuccess(data.message || 'User created successfully');
      setInviteEmail('');
      setInvitePassword('');
      setShowInviteModal(false);
      await fetchUsers(); // Refresh the list
    } catch (err: any) {
      console.error('Error inviting user:', err);
      setError(err.message || 'Failed to invite user');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm the new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!selectedUser) {
      setError('No user selected');
      return;
    }

    try {
      setResetLoading(true);
      setError(null);
      setSuccess(null);

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the reset-user-password edge function
      const { data, error: resetError } = await supabase.functions.invoke('reset-user-password', {
        body: {
          userId: selectedUser.id,
          newPassword: newPassword,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (resetError) {
        throw resetError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSuccess('Password reset successfully');
      setNewPassword('');
      setConfirmPassword('');
      setShowResetModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) {
      setError('No user selected for deletion');
      return;
    }

    // Prevent deleting yourself
    if (user?.id === userToDelete.id) {
      setError('You cannot delete your own account');
      setShowDeleteModal(false);
      setUserToDelete(null);
      return;
    }

    try {
      setDeleteLoading(true);
      setError(null);
      setSuccess(null);

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the delete-user edge function
      const { data, error: deleteError } = await supabase.functions.invoke('delete-user', {
        body: {
          userId: userToDelete.id,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (deleteError) {
        throw deleteError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuccess(`User ${userToDelete.email || 'deleted'} has been deleted successfully`);
      setShowDeleteModal(false);
      setUserToDelete(null);
      await fetchUsers(); // Refresh the list
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (!isMaster) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <div className="card-large max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="h1 mb-4">Access Denied</h1>
          <p className="text-text-dark-60">
            This page is only accessible to the master account.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light-gray">
      <div className="max-w-7xl mx-auto px-5 lg:px-[90px] py-8 lg:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="h1">User Management</h1>
              <p className="text-text-dark-60 mt-2">
                Manage all users, invite new users, and reset passwords
              </p>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={fetchUsers}
                variant="secondary"
                size="md"
                icon={<RefreshCw size={18} />}
              >
                Refresh
              </Button>
              <Button
                onClick={() => {
                  setShowInviteModal(true);
                  setError(null);
                  setSuccess(null);
                }}
                variant="primary"
                size="md"
                icon={<UserPlus size={18} />}
              >
                Invite User
              </Button>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 card-small bg-red-50 border-2 border-red-200">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle size={20} />
              <p className="font-bold">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 card-small bg-green-50 border-2 border-green-200">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle size={20} />
              <p className="font-bold">{success}</p>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="card-large">
          <div className="flex items-center gap-2 mb-6">
            <Users size={24} className="text-shortcut-blue" />
            <h2 className="text-xl font-extrabold text-shortcut-blue">
              All Users ({users.length})
            </h2>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-text-dark-60 mb-4" />
              <h3 className="text-lg font-extrabold text-shortcut-blue mb-2">
                No users found
              </h3>
              <p className="text-text-dark-60">
                Get started by inviting your first user.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-bold text-shortcut-blue">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-bold text-shortcut-blue">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-bold text-shortcut-blue">Last Sign In</th>
                    <th className="text-left py-3 px-4 text-sm font-bold text-shortcut-blue">Email Confirmed</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-shortcut-blue">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-neutral-light-gray transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-text-dark-60" />
                          <span className="text-base font-medium text-text-dark">{u.email || 'No email'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-base text-text-dark">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="py-4 px-4 text-base text-text-dark">
                        {formatDate(u.last_sign_in_at)}
                      </td>
                      <td className="py-4 px-4">
                        {u.email_confirmed_at ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                            <CheckCircle size={12} className="mr-1" />
                            Confirmed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                            <AlertCircle size={12} className="mr-1" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => {
                              setSelectedUser(u);
                              setShowResetModal(true);
                              setError(null);
                              setSuccess(null);
                            }}
                            variant="secondary"
                            size="sm"
                            icon={<Key size={16} />}
                          >
                            Reset Password
                          </Button>
                          {user?.id !== u.id && (
                            <button
                              onClick={() => {
                                setUserToDelete(u);
                                setShowDeleteModal(true);
                                setError(null);
                                setSuccess(null);
                              }}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-red-600 bg-transparent border-2 border-red-300 rounded-full hover:bg-red-50 hover:border-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invite User Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[200]">
            <div className="card-large max-w-md w-full z-[200] relative">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-extrabold text-shortcut-blue">Invite New User</h2>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInvitePassword('');
                    setError(null);
                  }}
                  className="text-text-dark-60 hover:text-shortcut-blue transition-colors p-2 rounded-lg hover:bg-neutral-light-gray"
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleInviteUser} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
                    placeholder="user@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2">
                    Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
                    placeholder="Leave empty to send invite email"
                    minLength={6}
                  />
                  <p className="mt-2 text-sm text-text-dark-60">
                    If left empty, an invite email will be sent. If provided, the user will be created with this password.
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200 flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteEmail('');
                      setInvitePassword('');
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={inviteLoading}
                    icon={<UserPlus size={18} />}
                  >
                    {invitePassword ? 'Create User' : 'Send Invite'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {showResetModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[200]">
            <div className="card-large max-w-md w-full z-[200] relative">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-extrabold text-shortcut-blue">Reset Password</h2>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setSelectedUser(null);
                    setNewPassword('');
                    setConfirmPassword('');
                    setError(null);
                  }}
                  className="text-text-dark-60 hover:text-shortcut-blue transition-colors p-2 rounded-lg hover:bg-neutral-light-gray"
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-base text-text-dark mb-2">
                  Reset password for:
                </p>
                <p className="text-lg font-bold text-shortcut-blue">
                  {selectedUser.email || 'No email'}
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2">
                    New Password *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
                    placeholder="Enter new password"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                </div>

                <div className="pt-4 border-t border-gray-200 flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setShowResetModal(false);
                      setSelectedUser(null);
                      setNewPassword('');
                      setConfirmPassword('');
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={resetLoading}
                    icon={<Key size={18} />}
                  >
                    Reset Password
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete User Confirmation Modal */}
        {showDeleteModal && userToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[200]">
            <div className="card-large max-w-md w-full z-[200] relative">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-extrabold text-shortcut-blue">Delete User</h2>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                    setError(null);
                  }}
                  className="text-text-dark-60 hover:text-shortcut-blue transition-colors p-2 rounded-lg hover:bg-neutral-light-gray"
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-base font-bold text-red-800 mb-1">Warning: This action cannot be undone</p>
                    <p className="text-sm text-red-700">
                      Deleting this user will permanently remove their account and all associated data.
                    </p>
                  </div>
                </div>
                <p className="text-base text-text-dark mb-2">
                  Are you sure you want to delete:
                </p>
                <p className="text-lg font-bold text-shortcut-blue">
                  {userToDelete.email || 'No email'}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={deleteLoading}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 lg:px-8 lg:py-4 text-sm font-bold text-white bg-red-600 rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] relative overflow-hidden"
                >
                  {deleteLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="small" />
                      Deleting...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Trash2 size={18} />
                      Delete User
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersManagement;

