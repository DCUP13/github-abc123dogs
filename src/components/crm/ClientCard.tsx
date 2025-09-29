import React from 'react';
import { User, Mail, Phone, MapPin, DollarSign, Calendar, Edit, Trash2, Star, TrendingUp, Clock, MessageCircle, CreditCard } from 'lucide-react';

export interface Client {
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

export interface ClientGrade {
  id: string;
  client_id: string;
  overall_score: number;
  financial_score: number;
  motivation_score: number;
  timeline_score: number;
  communication_score: number;
  ai_analysis: string;
  grade_letter: string;
  created_at: string;
  updated_at: string;
}

interface ClientCardProps {
  client: Client;
  grade?: ClientGrade;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'lead':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'prospect':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'closed':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'inactive':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'buyer':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
    case 'seller':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    case 'renter':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300';
    case 'landlord':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
};

const getGradeColor = (gradeLetter: string) => {
  if (gradeLetter.startsWith('A')) {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
  } else if (gradeLetter.startsWith('B')) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
  } else if (gradeLetter.startsWith('C')) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
  } else if (gradeLetter.startsWith('D')) {
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
  } else {
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

export function ClientCard({ client, grade, onEdit, onDelete }: ClientCardProps) {
  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return null;
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `$${min.toLocaleString()}+`;
    if (max) return `Up to $${max.toLocaleString()}`;
    return null;
  };

  const formatLocation = () => {
    const parts = [client.city, client.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 group hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {client.first_name} {client.last_name}
              </h3>
              {grade && (
                <span className={`inline-block px-2 py-1 text-xs font-bold rounded-full ${getGradeColor(grade.grade_letter)}`}>
                  {grade.grade_letter}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(client.client_type)}`}>
                {client.client_type}
              </span>
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(client.status)}`}>
                {client.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(client)}
            className="p-2 text-gray-400 hover:text-indigo-500 dark:text-gray-500 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            title="Edit client"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(client.id)}
            className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            title="Delete client"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {grade && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              AI Grade: {grade.overall_score}/100
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Financial:</span>
              <span className={`font-medium ${getScoreColor(grade.financial_score)}`}>
                {grade.financial_score}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Motivation:</span>
              <span className={`font-medium ${getScoreColor(grade.motivation_score)}`}>
                {grade.motivation_score}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Timeline:</span>
              <span className={`font-medium ${getScoreColor(grade.timeline_score)}`}>
                {grade.timeline_score}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Communication:</span>
              <span className={`font-medium ${getScoreColor(grade.communication_score)}`}>
                {grade.communication_score}
              </span>
            </div>
          </div>
          {grade.ai_analysis && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {grade.ai_analysis}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {client.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Mail className="w-4 h-4 text-gray-400" />
            <a href={`mailto:${client.email}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
              {client.email}
            </a>
          </div>
        )}
        
        {client.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Phone className="w-4 h-4 text-gray-400" />
            <a href={`tel:${client.phone}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
              {client.phone}
            </a>
          </div>
        )}
        
        {formatLocation() && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{formatLocation()}</span>
          </div>
        )}
        
        {formatBudget(client.budget_min, client.budget_max) && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span>{formatBudget(client.budget_min, client.budget_max)}</span>
          </div>
        )}
        
        {client.preferred_areas && client.preferred_areas.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Preferred Areas:</div>
            <div className="flex flex-wrap gap-1">
              {client.preferred_areas.slice(0, 3).map((area, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                >
                  {area}
                </span>
              ))}
              {client.preferred_areas.length > 3 && (
                <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                  +{client.preferred_areas.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
        
        {client.property_type && (
          <div className="mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Property Type: </span>
            <span className="text-xs text-gray-700 dark:text-gray-300">{client.property_type}</span>
          </div>
        )}
        
        {client.source && (
          <div className="mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Source: </span>
            <span className="text-xs text-gray-700 dark:text-gray-300">{client.source}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Calendar className="w-3 h-3" />
          <span>Added {new Date(client.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}