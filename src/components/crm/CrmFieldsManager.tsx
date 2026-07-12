import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, LayoutList } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface CustomField {
  id: string;
  org_id: string;
  field_key: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'dropdown' | 'boolean';
  options?: string[] | null;
  sort_order: number;
}

interface CrmFieldsManagerProps {
  orgId: string;
  onChange?: (fields: CustomField[]) => void;
}

export function CrmFieldsManager({ orgId, onChange }: CrmFieldsManagerProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [newField, setNewField] = useState({ label: '', type: 'text', options: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFields();
  }, [orgId]);

  const loadFields = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('client_custom_fields')
      .select('*')
      .eq('org_id', orgId)
      .order('sort_order', { ascending: true });
    const loaded = (data as CustomField[]) || [];
    setFields(loaded);
    onChange?.(loaded);
    setLoading(false);
  };

  const handleAdd = async () => {
    const label = newField.label.trim();
    if (!label) { setError('Field name is required.'); return; }
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (fields.some(f => f.field_key === key)) {
      setError('A field with this name already exists.');
      return;
    }
    try {
      setSaving(true); setError('');
      const options = newField.type === 'dropdown'
        ? newField.options.split(',').map(s => s.trim()).filter(Boolean)
        : null;
      const { error: err } = await supabase.from('client_custom_fields').insert({
        org_id: orgId,
        field_key: key,
        field_label: label,
        field_type: newField.type,
        options: options?.length ? options : null,
        sort_order: fields.length,
      });
      if (err) throw err;
      setNewField({ label: '', type: 'text', options: '' });
      await loadFields();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const field = fields.find(f => f.id === id);
    if (!field) return;
    if (!confirm(`Delete "${field.field_label}"? All stored values will also be removed.`)) return;
    await supabase.from('client_custom_values').delete().eq('field_key', field.field_key).eq('org_id', orgId);
    await supabase.from('client_custom_fields').delete().eq('id', id);
    await loadFields();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <LayoutList className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">CRM Custom Fields</h3>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Extra data fields added to all client records in this organization.
      </p>

      {error && (
        <div className="p-2.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs">{error}</div>
      )}

      {loading ? (
        <p className="text-xs text-gray-400 py-2">Loading…</p>
      ) : fields.length === 0 ? (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">No custom fields yet.</p>
      ) : (
        <div className="space-y-1.5">
          {fields.map(f => (
            <div key={f.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 min-w-0">
                <GripVertical className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{f.field_label}</span>
                <span className="text-xs text-gray-400 capitalize flex-shrink-0">{f.field_type}</span>
                {f.options && f.options.length > 0 && (
                  <span className="text-xs text-gray-400 truncate">— {f.options.join(', ')}</span>
                )}
              </div>
              <button
                onClick={() => handleDelete(f.id)}
                className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded flex-shrink-0 ml-2"
                title="Delete field"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new field */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2.5">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Add Field</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={newField.label}
            onChange={e => { setNewField(p => ({ ...p, label: e.target.value })); setError(''); }}
            placeholder="Field name (e.g. Pre-approval Status)"
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white"
          />
          <select
            value={newField.type}
            onChange={e => setNewField(p => ({ ...p, type: e.target.value }))}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="dropdown">Dropdown</option>
            <option value="boolean">Yes / No</option>
          </select>
        </div>
        {newField.type === 'dropdown' && (
          <input
            type="text"
            value={newField.options}
            onChange={e => setNewField(p => ({ ...p, options: e.target.value }))}
            placeholder="Options (comma-separated): Option A, Option B"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white"
          />
        )}
        <div className="flex justify-end">
          <button
            onClick={handleAdd}
            disabled={saving || !newField.label.trim()}
            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            {saving ? 'Adding…' : 'Add Field'}
          </button>
        </div>
      </div>
    </div>
  );
}
