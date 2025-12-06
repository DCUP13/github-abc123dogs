import React, { useState, useEffect } from 'react';
import { Users, Mail, Calendar, UserPlus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TeamViewProps {
  onSignOut: () => void;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  email?: string;
  name?: string;
}

export function TeamView({ onSignOut }: TeamViewProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationName, setOrganizationName] = useState<string>('');
  const [organizationId, setOrganizationId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'member'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!memberData) {
        setLoading(false);
        return;
      }

      setOrganizationId(memberData.organization_id);
      setUserRole(memberData.role);

      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', memberData.organization_id)
        .single();

      if (orgData) {
        setOrganizationName(orgData.name);
      }

      const { data: membersData, error } = await supabase
        .from('organization_members_with_emails')
        .select('*')
        .eq('organization_id', memberData.organization_id)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      setMembers(membersData || []);

    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      setInviteError('Please enter an email address');
      return;
    }

    setInviteLoading(true);
    setInviteError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setInviteError('You must be logged in to invite members');
        setInviteLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('invite-team-member', {
        body: {
          email: inviteEmail,
          role: inviteRole,
          organization_id: organizationId,
          invited_by: user.id
        }
      });

      if (error) throw error;

      setInviteSuccess(true);
      setTimeout(() => {
        setShowInviteDialog(false);
        setInviteEmail('');
        setInviteRole('member');
        setInviteSuccess(false);
        loadTeamMembers();
      }, 2000);
    } catch (error: any) {
      setInviteError(error.message || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Members</h1>
              {organizationName && (
                <p className="text-gray-600 dark:text-gray-400">{organizationName}</p>
              )}
            </div>
          </div>
          {(userRole === 'owner' || userRole === 'manager') && (
            <button
              onClick={() => setShowInviteDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Add Member
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">No team members yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Your manager will add team members soon
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="p-5 bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-750 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold text-lg">
                        {member.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                        {member.name || 'Unknown'}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          member.role === 'owner'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-400'
                            : member.role === 'manager'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'
                        }`}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showInviteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invite Team Member</h2>
              <button
                onClick={() => {
                  setShowInviteDialog(false);
                  setInviteError(null);
                  setInviteEmail('');
                  setInviteRole('member');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-green-600 dark:text-green-400 font-medium">Invitation sent successfully!</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@example.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'manager' | 'member')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="member">Member</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>

                  {inviteError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowInviteDialog(false);
                      setInviteError(null);
                      setInviteEmail('');
                      setInviteRole('member');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInviteMember}
                    disabled={inviteLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {inviteLoading ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
