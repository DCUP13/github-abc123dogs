import React, { useState, useEffect } from 'react';
import { Users, Mail, Calendar } from 'lucide-react';
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

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!memberData) {
        setLoading(false);
        return;
      }

      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', memberData.organization_id)
        .single();

      if (orgData) {
        setOrganizationName(orgData.name);
      }

      const { data: membersData, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          joined_at
        `)
        .eq('organization_id', memberData.organization_id)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const membersWithEmails = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
          return {
            ...member,
            email: userData.user?.email,
            name: userData.user?.user_metadata?.name || userData.user?.email?.split('@')[0]
          };
        })
      );

      setMembers(membersWithEmails);

    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Members</h1>
            {organizationName && (
              <p className="text-gray-600 dark:text-gray-400">{organizationName}</p>
            )}
          </div>
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
    </div>
  );
}
