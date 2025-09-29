import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, Phone, Mail, MapPin, Calendar, Edit, Trash2, Eye, MessageSquare, User, Building, DollarSign, Clock, FileText, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CRMProps {
  onSignOut: () => void;
  currentView: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  client_type: 'buyer' | 'seller' | 'renter' | 'landlord';
  status: 'lead' | 'prospect' | 'active' | 'closed' | 'inactive';
  budget_min?: number;
  budget_max?: number;
  preferred_areas?: string[];
  property_type?: string;
  notes?: string;
  source?: string;
  created_at: string;
  updated_at: string;
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

interface ClientWithInteractions extends Client {
  interactions: Interaction[];
}

const clientTypes = [
  { value: 'buyer', label: 'Buyer', icon: '🏠' },
  { value: 'seller', label: 'Seller', icon: '💰' },
  { value: 'renter', label: 'Renter', icon: '🔑' },
  { value: 'landlord', label: 'Landlord', icon: '🏢' }
];

const clientStatuses = [
  { value: 'lead', label: 'Lead', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  { value: 'prospect', label: 'Prospect', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  { value: 'closed', label: 'Closed', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
  { value: 'inactive', label: 'Inactive', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' }
];

const interactionTypes = [
  { value: 'call', label: 'Phone Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'showing', label: 'Property Showing', icon: Building },
  { value: 'text', label: 'Text Message', icon: MessageSquare },
  { value: 'note', label: 'Note', icon: FileText }
];

const propertyTypes = [
  'Single Family Home',
  'Condo',
  'Townhouse',
  'Multi-Family',
  'Land',
  'Commercial',
  'Investment Property'
];

const statesAndCities = {
  'AL': ['Birmingham', 'Montgomery', 'Mobile', 'Huntsville', 'Tuscaloosa'],
  'AK': ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka', 'Ketchikan'],
  'AZ': ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale'],
  'AR': ['Little Rock', 'Fort Smith', 'Fayetteville', 'Springdale', 'Jonesboro'],
  'CA': ['Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno'],
  'CO': ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood'],
  'CT': ['Bridgeport', 'New Haven', 'Hartford', 'Stamford', 'Waterbury'],
  'DE': ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Smyrna'],
  'FL': ['Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg'],
  'GA': ['Atlanta', 'Augusta', 'Columbus', 'Macon', 'Savannah'],
  'HI': ['Honolulu', 'Pearl City', 'Hilo', 'Kailua', 'Waipahu'],
  'ID': ['Boise', 'Meridian', 'Nampa', 'Idaho Falls', 'Pocatello'],
  'IL': ['Chicago', 'Aurora', 'Rockford', 'Joliet', 'Naperville'],
  'IN': ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel'],
  'IA': ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Waterloo'],
  'KS': ['Wichita', 'Overland Park', 'Kansas City', 'Topeka', 'Olathe'],
  'KY': ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington'],
  'LA': ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles'],
  'ME': ['Portland', 'Lewiston', 'Bangor', 'South Portland', 'Auburn'],
  'MD': ['Baltimore', 'Frederick', 'Rockville', 'Gaithersburg', 'Bowie'],
  'MA': ['Boston', 'Worcester', 'Springfield', 'Lowell', 'Cambridge'],
  'MI': ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Lansing'],
  'MN': ['Minneapolis', 'Saint Paul', 'Rochester', 'Duluth', 'Bloomington'],
  'MS': ['Jackson', 'Gulfport', 'Southaven', 'Hattiesburg', 'Biloxi'],
  'MO': ['Kansas City', 'Saint Louis', 'Springfield', 'Independence', 'Columbia'],
  'MT': ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Butte'],
  'NE': ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney'],
  'NV': ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks'],
  'NH': ['Manchester', 'Nashua', 'Concord', 'Derry', 'Rochester'],
  'NJ': ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Edison'],
  'NM': ['Albuquerque', 'Las Cruces', 'Rio Rancho', 'Santa Fe', 'Roswell'],
  'NY': ['New York', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse'],
  'NC': ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem'],
  'ND': ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo'],
  'OH': ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron'],
  'OK': ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Lawton'],
  'OR': ['Portland', 'Eugene', 'Salem', 'Gresham', 'Hillsboro'],
  'PA': ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading'],
  'RI': ['Providence', 'Warwick', 'Cranston', 'Pawtucket', 'East Providence'],
  'SC': ['Columbia', 'Charleston', 'North Charleston', 'Mount Pleasant', 'Rock Hill'],
  'SD': ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown'],
  'TN': ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville'],
  'TX': ['Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth'],
  'UT': ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem'],
  'VT': ['Burlington', 'Essex', 'South Burlington', 'Colchester', 'Rutland'],
  'VA': ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond', 'Newport News'],
  'WA': ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue'],
  'WV': ['Charleston', 'Huntington', 'Parkersburg', 'Morgantown', 'Wheeling'],
  'WI': ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine'],
  'WY': ['Cheyenne', 'Casper', 'Laramie', 'Gillette', 'Rock Springs']
};

export function CRM({ onSignOut, currentView }: CRMProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientWithInteractions | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [clientForm, setClientForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    client_type: 'buyer' as Client['client_type'],
    status: 'lead' as Client['status'],
    budget_min: '',
    budget_max: '',
    preferred_areas: [] as string[],
    property_type: '',
    notes: '',
    source: ''
  });

  const [interactionForm, setInteractionForm] = useState({
    interaction_type: 'call' as Interaction['interaction_type'],
    subject: '',
    notes: '',
    interaction_date: new Date().toISOString().slice(0, 16),
    follow_up_date: ''
  });

  const [newPreferredArea, setNewPreferredArea] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

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

  const fetchClientWithInteractions = async (clientId: string) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const [clientResult, interactionsResult] = await Promise.all([
        supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .eq('user_id', user.data.user.id)
          .single(),
        supabase
          .from('client_interactions')
          .select('*')
          .eq('client_id', clientId)
          .eq('user_id', user.data.user.id)
          .order('interaction_date', { ascending: false })
      ]);

      if (clientResult.error) throw clientResult.error;
      if (interactionsResult.error) throw interactionsResult.error;

      setSelectedClient({
        ...clientResult.data,
        interactions: interactionsResult.data || []
      });
    } catch (error) {
      console.error('Error fetching client details:', error);
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const clientData = {
        ...clientForm,
        user_id: user.data.user.id,
        budget_min: clientForm.budget_min ? parseFloat(clientForm.budget_min) : null,
        budget_max: clientForm.budget_max ? parseFloat(clientForm.budget_max) : null,
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
      if (!user.data.user) return;

      const interactionData = {
        ...interactionForm,
        user_id: user.data.user.id,
        client_id: selectedClient.id,
        interaction_date: new Date(interactionForm.interaction_date).toISOString(),
        follow_up_date: interactionForm.follow_up_date ? new Date(interactionForm.follow_up_date).toISOString() : null
      };

      const { error } = await supabase
        .from('client_interactions')
        .insert(interactionData);

      if (error) throw error;

      await fetchClientWithInteractions(selectedClient.id);
      resetInteractionForm();
    } catch (error) {
      console.error('Error saving interaction:', error);
      alert('Failed to save interaction. Please try again.');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!window.confirm('Are you sure you want to delete this client? This will also delete all associated interactions.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      await fetchClients();
      if (selectedClient?.id === clientId) {
        setSelectedClient(null);
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client. Please try again.');
    }
  };

  const handleDeleteInteraction = async (interactionId: string) => {
    if (!window.confirm('Are you sure you want to delete this interaction?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('client_interactions')
        .delete()
        .eq('id', interactionId);

      if (error) throw error;
      
      if (selectedClient) {
        await fetchClientWithInteractions(selectedClient.id);
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

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone?.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    const matchesType = typeFilter === 'all' || client.client_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatCurrency = (amount?: number) => {
    if (!amount) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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

  if (isLoading) {
    return (
      <div className="p-8 bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 bg-white dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {!selectedClient ? (
          <>
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Statuses</option>
                {clientStatuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                {clientTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
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
                filteredClients.map((client) => {
                  const statusConfig = clientStatuses.find(s => s.value === client.status);
                  const typeConfig = clientTypes.find(t => t.value === client.client_type);

                  return (
                    <div
                      key={client.id}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 group hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => fetchClientWithInteractions(client.id)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {client.first_name} {client.last_name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusConfig?.color}`}>
                              {statusConfig?.label}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {typeConfig?.icon} {typeConfig?.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClient(client);
                            }}
                            className="p-2 text-gray-400 hover:text-indigo-500 dark:text-gray-500 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClient(client.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        {client.email && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <Mail className="w-4 h-4" />
                            {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <Phone className="w-4 h-4" />
                            {client.phone}
                          </div>
                        )}
                        {(client.city || client.state) && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <MapPin className="w-4 h-4" />
                            {[client.city, client.state].filter(Boolean).join(', ')}
                          </div>
                        )}
                        {(client.budget_min || client.budget_max) && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <DollarSign className="w-4 h-4" />
                            {client.budget_min && client.budget_max 
                              ? `${formatCurrency(client.budget_min)} - ${formatCurrency(client.budget_max)}`
                              : client.budget_min 
                                ? `${formatCurrency(client.budget_min)}+`
                                : `Up to ${formatCurrency(client.budget_max)}`
                            }
                          </div>
                        )}
                      </div>

                      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                        Added {new Date(client.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedClient(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedClient.first_name} {selectedClient.last_name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      clientStatuses.find(s => s.value === selectedClient.status)?.color
                    }`}>
                      {clientStatuses.find(s => s.value === selectedClient.status)?.label}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {clientTypes.find(t => t.value === selectedClient.client_type)?.icon}{' '}
                      {clientTypes.find(t => t.value === selectedClient.client_type)?.label}
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
                        <Mail className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{selectedClient.email}</span>
                      </div>
                    )}
                    {selectedClient.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{selectedClient.phone}</span>
                      </div>
                    )}
                    {(selectedClient.address || selectedClient.city || selectedClient.state) && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div className="text-gray-900 dark:text-white">
                          {selectedClient.address && <div>{selectedClient.address}</div>}
                          <div>
                            {[selectedClient.city, selectedClient.state, selectedClient.zip_code]
                              .filter(Boolean).join(', ')}
                          </div>
                        </div>
                      </div>
                    )}
                    {(selectedClient.budget_min || selectedClient.budget_max) && (
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">
                          {selectedClient.budget_min && selectedClient.budget_max 
                            ? `${formatCurrency(selectedClient.budget_min)} - ${formatCurrency(selectedClient.budget_max)}`
                            : selectedClient.budget_min 
                              ? `${formatCurrency(selectedClient.budget_min)}+`
                              : `Up to ${formatCurrency(selectedClient.budget_max)}`
                          }
                        </span>
                      </div>
                    )}
                    {selectedClient.property_type && (
                      <div className="flex items-center gap-3">
                        <Building className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{selectedClient.property_type}</span>
                      </div>
                    )}
                    {selectedClient.preferred_areas && selectedClient.preferred_areas.length > 0 && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">Preferred Areas</div>
                          <div className="flex flex-wrap gap-1">
                            {selectedClient.preferred_areas.map((area, index) => (
                              <span
                                key={index}
                                className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                              >
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedClient.source && (
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">Source</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{selectedClient.source}</div>
                        </div>
                      </div>
                    )}
                    {selectedClient.notes && (
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">Notes</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                            {selectedClient.notes}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Interaction History</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedClient.interactions.length} interactions
                    </span>
                  </div>

                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {selectedClient.interactions.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">No interactions recorded yet</p>
                      </div>
                    ) : (
                      selectedClient.interactions.map((interaction) => {
                        const typeConfig = interactionTypes.find(t => t.value === interaction.interaction_type);
                        const TypeIcon = typeConfig?.icon || MessageSquare;

                        return (
                          <div
                            key={interaction.id}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 group hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                  <TypeIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {typeConfig?.label}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatDate(interaction.interaction_date)}
                                    </span>
                                  </div>
                                  {interaction.subject && (
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      {interaction.subject}
                                    </div>
                                  )}
                                  {interaction.notes && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                      {interaction.notes}
                                    </div>
                                  )}
                                  {interaction.follow_up_date && (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-amber-600 dark:text-amber-400">
                                      <Clock className="w-3 h-3" />
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
                                className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Client Form Modal */}
        {showClientForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl my-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {editingClient ? 'Edit Client' : 'Add New Client'}
                </h3>
                <button
                  onClick={resetClientForm}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveClient} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={clientForm.first_name}
                      onChange={(e) => setClientForm(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={clientForm.last_name}
                      onChange={(e) => setClientForm(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={clientForm.email}
                      onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={clientForm.phone}
                      onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={clientForm.address}
                    onChange={(e) => setClientForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={clientForm.city}
                      onChange={(e) => setClientForm(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      State
                    </label>
                    <select
                      value={clientForm.state}
                      onChange={(e) => setClientForm(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select State</option>
                      {Object.keys(statesAndCities).map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={clientForm.zip_code}
                      onChange={(e) => setClientForm(prev => ({ ...prev, zip_code: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Client Type
                    </label>
                    <select
                      value={clientForm.client_type}
                      onChange={(e) => setClientForm(prev => ({ ...prev, client_type: e.target.value as Client['client_type'] }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {clientTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={clientForm.status}
                      onChange={(e) => setClientForm(prev => ({ ...prev, status: e.target.value as Client['status'] }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {clientStatuses.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Budget Min
                    </label>
                    <input
                      type="number"
                      value={clientForm.budget_min}
                      onChange={(e) => setClientForm(prev => ({ ...prev, budget_min: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Budget Max
                    </label>
                    <input
                      type="number"
                      value={clientForm.budget_max}
                      onChange={(e) => setClientForm(prev => ({ ...prev, budget_max: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Property Type
                  </label>
                  <select
                    value={clientForm.property_type}
                    onChange={(e) => setClientForm(prev => ({ ...prev, property_type: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Property Type</option>
                    {propertyTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Preferred Areas
                  </label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPreferredArea}
                        onChange={(e) => setNewPreferredArea(e.target.value)}
                        placeholder="Add preferred area"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addPreferredArea();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addPreferredArea}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Add
                      </button>
                    </div>
                    {clientForm.preferred_areas.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {clientForm.preferred_areas.map((area, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded text-sm"
                          >
                            {area}
                            <button
                              type="button"
                              onClick={() => removePreferredArea(area)}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Source
                  </label>
                  <input
                    type="text"
                    value={clientForm.source}
                    onChange={(e) => setClientForm(prev => ({ ...prev, source: e.target.value }))}
                    placeholder="e.g., Referral, Website, Cold Call"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={clientForm.notes}
                    onChange={(e) => setClientForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Additional notes about the client..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={resetClientForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingClient ? 'Update Client' : 'Save Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Interaction Form Modal */}
        {showInteractionForm && selectedClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Add Interaction
                </h3>
                <button
                  onClick={resetInteractionForm}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveInteraction} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Interaction Type
                  </label>
                  <select
                    value={interactionForm.interaction_type}
                    onChange={(e) => setInteractionForm(prev => ({ ...prev, interaction_type: e.target.value as Interaction['interaction_type'] }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {interactionTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={interactionForm.subject}
                    onChange={(e) => setInteractionForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Brief subject or title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={interactionForm.notes}
                    onChange={(e) => setInteractionForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Interaction details..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Interaction Date
                  </label>
                  <input
                    type="datetime-local"
                    value={interactionForm.interaction_date}
                    onChange={(e) => setInteractionForm(prev => ({ ...prev, interaction_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Follow-up Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={interactionForm.follow_up_date}
                    onChange={(e) => setInteractionForm(prev => ({ ...prev, follow_up_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={resetInteractionForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Interaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}