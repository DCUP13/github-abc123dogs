import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, Phone, Mail, MapPin, DollarSign, Calendar, Building, User, Edit, Trash2, X, Save, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ClientCard, type Client, type ClientGrade } from './crm/ClientCard';

interface CRMProps {
  onSignOut: () => void;
  currentView: string;
}

interface Interaction {
  id: string;
  client_id: string;
  interaction_type: 'call' | 'email' | 'meeting' | 'showing' | 'text' | 'note';
  subject?: string;
  notes?: string;
  interaction_date: string;
  follow_up_date?: string;
  created_at: string;
  updated_at: string;
}

const clientTypes = [
  { value: 'buyer', label: 'Buyer', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
];

const clientStatuses = [
  { value: 'lead', label: 'Lead', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
];

const interactionTypes = [
  { value: 'call', label: 'Call', icon: Phone },
];

const propertyTypes = [
  'Single Family Home',
  'Condo',
  'Townhouse',
];

export function CRM({ onSignOut, currentView }: CRMProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientGrades, setClientGrades] = useState<Record<string, ClientGrade>>({});
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const [clientForm, setClientForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    client_type: 'buyer' as const,
    status: 'lead' as const,
    budget_min: '',
    budget_max: '',
    preferred_areas: [] as string[],
    property_type: '',
    notes: '',
    source: ''
  });

  const [interactionForm, setInteractionForm] = useState({
    interaction_type: 'call' as const,
    subject: '',
    notes: '',
    interaction_date: new Date().toISOString().slice(0, 16),
    follow_up_date: ''
  });

  const [newPreferredArea, setNewPreferredArea] = useState('');

  useEffect(() => {
    fetchClients();
    fetchClientGrades();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchInteractions(selectedClient.id);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.data.user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClientGrades = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data, error } = await supabase
        .from('client_grades')
        .select('*')
        .eq('user_id', user.data.user.id);

      if (error) throw error;
      
      const gradesMap = (data || []).reduce((acc, grade) => {
        acc[grade.client_id] = grade;
        return acc;
      }, {} as Record<string, ClientGrade>);
      
      setClientGrades(gradesMap);
    } catch (error) {
      console.error('Error fetching client grades:', error);
    }
  };

  const fetchInteractions = async (clientId: string) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data, error } = await supabase
        .from('client_interactions')
        .select('*')
        .eq('user_id', user.data.user.id)
        .eq('client_id', clientId)
        .order('interaction_date', { ascending: false });

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error('Error fetching interactions:', error);
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('User not authenticated');

      const clientData = {
        ...clientForm,
        budget_min: clientForm.budget_min ? parseFloat(clientForm.budget_min) : null,
        budget_max: clientForm.budget_max ? parseFloat(clientForm.budget_max) : null,
        preferred_areas: clientForm.preferred_areas.length > 0 ? clientForm.preferred_areas : null,
        user_id: user.data.user.id,
        updated_at: new Date().toISOString()
      };

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(clientData);
        if (error) throw error;
      }

      await fetchClients();
      await fetchClientGrades();
      resetClientForm();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Failed to save client. Please try again.');
    }
  };

  const handleSaveInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClient) return;

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('User not authenticated');

      const interactionData = {
        ...interactionForm,
        client_id: selectedClient.id,
        user_id: user.data.user.id,
        interaction_date: new Date(interactionForm.interaction_date).toISOString(),
        follow_up_date: interactionForm.follow_up_date ? new Date(interactionForm.follow_up_date).toISOString() : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('client_interactions')
        .insert(interactionData);

      if (error) throw error;

      await fetchInteractions(selectedClient.id);
      resetInteractionForm();
    } catch (error) {
      console.error('Error saving interaction:', error);
      alert('Failed to save interaction. Please try again.');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this client? This will also delete all associated interactions.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchClients();
      await fetchClientGrades();
      
      if (selectedClient?.id === id) {
        setSelectedClient(null);
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client. Please try again.');
    }
  };

  const handleDeleteInteraction = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this interaction?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('client_interactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      if (selectedClient) {
        await fetchInteractions(selectedClient.id);
      }
    } catch (error) {
      console.error('Error deleting interaction:', error);
      alert('Failed to delete interaction. Please try again.');
    }
  };

  const resetClientForm = () => {
    setClientForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      client_type: 'buyer',
      status: 'lead',
      budget_min: '',
      budget_max: '',
      preferred_areas: [],
      property_type: '',
      notes: '',
      source: ''
    });
    setEditingClient(null);
    setShowClientForm(false);
  };

  const resetInteractionForm = () => {
    setInteractionForm({
      interaction_type: 'call',
      subject: '',
      notes: '',
      interaction_date: new Date().toISOString().slice(0, 16),
      follow_up_date: ''
    });
    setShowInteractionForm(false);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setClientForm({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zip_code: client.zip_code || '',
      client_type: client.client_type,
      status: client.status,
      budget_min: client.budget_min?.toString() || '',
      budget_max: client.budget_max?.toString() || '',
      preferred_areas: client.preferred_areas || [],
      property_type: client.property_type || '',
      notes: client.notes || '',
      source: client.source || ''
    });
    setShowClientForm(true);
  };

  const addPreferredArea = () => {
    if (newPreferredArea.trim() && !clientForm.preferred_areas.includes(newPreferredArea.trim())) {
      setClientForm(prev => ({
        ...prev,
        preferred_areas: [...prev.preferred_areas, newPreferredArea.trim()]
      }));
      setNewPreferredArea('');
    }
  };

  const removePreferredArea = (area: string) => {
    setClientForm(prev => ({
      ...prev,
      preferred_areas: prev.preferred_areas.filter(a => a !== area)
    }));
  };

  const getFilteredClients = () => {
    return clients.filter(client => {
      const matchesSearch = 
        client.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery);

      const matchesType = filterType === 'all' || client.client_type === filterType;
      const matchesStatus = filterStatus === 'all' || client.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  };

  const getClientTypeInfo = (type: string) => {
    return clientTypes.find(t => t.value === type) || clientTypes[0];
  };

  const getClientStatusInfo = (status: string) => {
    return clientStatuses.find(s => s.value === status) || clientStatuses[0];
  };

  const getInteractionTypeInfo = (type: string) => {
    return interactionTypes.find(t => t.value === type) || interactionTypes[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredClients = getFilteredClients();

  return (
    <div className="p-8 bg-white dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {!selectedClient ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM</h1>
              </div>
              <button
                onClick={() => setShowClientForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </button>
            </div>

            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                {clientTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Statuses</option>
                {clientStatuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              {filteredClients.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {clients.length === 0 ? 'No clients yet' : 'No clients found'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {clients.length === 0 
                      ? 'Add your first client to get started'
                      : 'Try adjusting your search or filters'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredClients.map((client) => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      grade={clientGrades[client.id]}
                      onEdit={handleEditClient}
                      onDelete={handleDeleteClient}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedClient(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedClient.first_name} {selectedClient.last_name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getClientTypeInfo(selectedClient.client_type).color}`}>
                      {getClientTypeInfo(selectedClient.client_type).label}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getClientStatusInfo(selectedClient.status).color}`}>
                      {getClientStatusInfo(selectedClient.status).label}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditClient(selectedClient)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Client
                </button>
                <button
                  onClick={() => setShowInteractionForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Interaction
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Client Details</h2>
                  
                  <div className="space-y-4">
                    {selectedClient.email && (
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{selectedClient.email}</span>
                      </div>
                    )}
                    
                    {selectedClient.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{selectedClient.phone}</span>
                      </div>
                    )}
                    
                    {(selectedClient.address || selectedClient.city || selectedClient.state) && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                        <div className="text-gray-900 dark:text-white">
                          {selectedClient.address && <div>{selectedClient.address}</div>}
                          <div>
                            {[selectedClient.city, selectedClient.state, selectedClient.zip_code]
                              .filter(Boolean)
                              .join(', ')}
                          </div>
                        </div>
                      </div>
                    )}

                    {(selectedClient.budget_min || selectedClient.budget_max) && (
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">
                          {selectedClient.budget_min ? formatCurrency(selectedClient.budget_min) : 'No min'} - {selectedClient.budget_max ? formatCurrency(selectedClient.budget_max) : 'No max'}
                        </span>
                      </div>
                    )}

                    {selectedClient.property_type && (
                      <div className="flex items-center gap-3">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{selectedClient.property_type}</span>
                      </div>
                    )}

                    {selectedClient.preferred_areas && selectedClient.preferred_areas.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preferred Areas</h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedClient.preferred_areas.map((area, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedClient.source && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source</h4>
                        <p className="text-gray-900 dark:text-white">{selectedClient.source}</p>
                      </div>
                    )}

                    {selectedClient.notes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</h4>
                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedClient.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Interaction History</h2>
                    <button
                      onClick={() => setShowInteractionForm(true)}
                      className="inline-flex items-center px-3 py-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </button>
                  </div>

                  {interactions.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 dark:text-gray-400">No interactions recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {interactions.map((interaction) => {
                        const typeInfo = getInteractionTypeInfo(interaction.interaction_type);
                        const TypeIcon = typeInfo.icon;

                        return (
                          <div
                            key={interaction.id}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                  <TypeIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                      {typeInfo.label}
                                    </h4>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                      {formatDate(interaction.interaction_date)}
                                    </span>
                                  </div>
                                  
                                  {interaction.subject && (
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      {interaction.subject}
                                    </p>
                                  )}
                                  
                                  {interaction.notes && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                      {interaction.notes}
                                    </p>
                                  )}
                                  
                                  {interaction.follow_up_date && (
                                    <div className="flex items-center gap-1 mt-2 text-sm text-amber-600 dark:text-amber-400">
                                      <Calendar className="w-4 h-4" />
                                      Follow up: {formatDate(interaction.follow_up_date)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteInteraction(interaction.id);
                                }}
                                className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded"