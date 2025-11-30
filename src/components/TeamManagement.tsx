import React, { useState, useEffect } from 'react';
import { Users, Plus, Mail, Trash2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TeamManagementProps {
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

interface Invitation {
  id: string;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export function TeamManagement({ onSignOut }: TeamManagementProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!memberData || !['owner', 'manager'].includes(memberData.role)) {
        setStatus({ type: 'error', message: 'You do not have permission to manage the team.' });
        return;
      }

      setOrganizationId(memberData.organization_id);

      const { data: membersData, error: membersError } = await supabase
        .from('organization_members_with_emails')
        .select('*')
        .eq('organization_id', memberData.organization_id)
        .order('joined_at', { ascending: false });

      if (membersError) throw membersError;

      setMembers(membersData || []);

      const { data: invitationsData, error: invitationsError } = await supabase
        .from('member_invitations')
        .select('*')
        .eq('organization_id', memberData.organization_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;
      setInvitations(invitationsData || []);

    } catch (error) {
      console.error('Error loading team data:', error);
      setStatus({ type: 'error', message: 'Failed to load team data' });
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !organizationId) return;

    setLoading(true);
    setStatus(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/invite-team-member`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          organization_id: organizationId,
          invited_by: user.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation');
      }

      setStatus({ type: 'success', message: `Invitation sent to ${inviteEmail}` });
      setInviteEmail('');
      setShowInviteDialog(false);
      loadTeamData();

    } catch (error) {
      console.error('Error inviting member:', error);
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to send invitation'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setStatus({ type: 'success', message: 'Team member removed successfully' });
      loadTeamData();

    } catch (error) {
      console.error('Error removing member:', error);
      setStatus({ type: 'error', message: 'Failed to remove team member' });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('member_invitations')
        .update({ status: 'expired' })
        .eq('id', invitationId);

      if (error) throw error;

      setStatus({ type: 'success', message: 'Invitation cancelled' });
      loadTeamData();

    } catch (error) {
      console.error('Error cancelling invitation:', error);
      setStatus({ type: 'error', message: 'Failed to cancel invitation' });
    }
  };

  const switchToMemberView = () => {
    localStorage.setItem('loginType', 'member');
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Management</h1>
              <button
                onClick={switchToMemberView}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-1"
              >
                Switch to Member View →
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowInviteDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Invite Member
          </button>
        </div>

        {status && (
          <div className={`flex items-center gap-2 p-4 rounded-lg mb-6 ${
            status.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {status.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <p>{status.message}</p>
          </div>
        )}

        <div className="grid gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Team Members</h2>
            <div className="space-y-3">
              {members.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No team members yet</p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                          {member.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{member.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        member.role === 'owner'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-400'
                          : member.role === 'manager'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'
                      }`}>
                        {member.role}
                      </span>
                      {member.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {invitations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Pending Invitations</h2>
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{invitation.email}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Invited {new Date(invitation.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showInviteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Invite Team Member</h3>
              <button
                onClick={() => setShowInviteDialog(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="member@example.com"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
