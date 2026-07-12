import React, { useRef, useState } from 'react';
import { X, Upload, ChevronRight, ChevronLeft, Check, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

interface CustomField {
  id: string;
  org_id: string;
  field_key: string;
  field_label: string;
  field_type: string;
  options?: string[] | null;
  sort_order: number;
}

interface OrgMember {
  user_id: string;
  role: string;
  profile?: { email: string; display_name?: string };
}

interface Props {
  orgId: string;
  orgMembers: OrgMember[];
  customFields: CustomField[];
  currentUserId: string;
  onClose: () => void;
  onImported: () => void;
}

type MappingTarget = string | 'skip' | 'new_custom_field';

const KNOWN_FIELDS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip_code', label: 'ZIP Code' },
  { key: 'client_type', label: 'Client Type (buyer/seller/renter/landlord)' },
  { key: 'status', label: 'Status (lead/prospect/active/closed/inactive)' },
  { key: 'budget_min', label: 'Budget Min' },
  { key: 'budget_max', label: 'Budget Max' },
  { key: 'property_type', label: 'Property Type' },
  { key: 'preferred_areas', label: 'Preferred Areas (comma-separated)' },
  { key: 'source', label: 'Source' },
  { key: 'notes', label: 'Notes' },
];

interface ColumnMapping {
  csvHeader: string;
  target: MappingTarget;
  newFieldLabel: string;
  newFieldType: string;
}

interface ImportSummary {
  imported: number;
  skipped: number;
  errors: number;
}

export function CsvImportDialog({ orgId, orgMembers, customFields, currentUserId, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [assignTo, setAssignTo] = useState(currentUserId);
  const [mapping, setMapping] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  // ─── Step 1: Parse CSV ───────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = (ev.target?.result as string) || '';
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV must have at least a header row and one data row.'); return; }
      const headers = parseCSVLine(lines[0]);
      const rows = lines.slice(1).map(l => parseCSVLine(l)).filter(r => r.some(c => c.trim()));
      setCsvHeaders(headers);
      setCsvPreview(rows.slice(0, 5));
      setCsvRows(rows);
    };
    reader.readAsText(file);
  };

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  // ─── Step 2: AI Mapping ──────────────────────────────────────────────────
  const runAiMapping = async () => {
    setMapping(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-csv-map`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          headers: csvHeaders,
          sample_rows: csvPreview,
          known_fields: KNOWN_FIELDS.map(f => f.key),
          custom_fields: customFields.map(f => ({ key: f.field_key, label: f.field_label })),
        }),
      });

      let aiMappings: Record<string, { target: string; new_field_label?: string; new_field_type?: string }> = {};
      if (res.ok) {
        const json = await res.json();
        aiMappings = json.mappings || {};
      }

      // Fall back to simple heuristics if AI is unavailable
      const built: ColumnMapping[] = csvHeaders.map(h => {
        const ai = aiMappings[h];
        if (ai) {
          return {
            csvHeader: h,
            target: ai.target as MappingTarget,
            newFieldLabel: ai.new_field_label || h,
            newFieldType: ai.new_field_type || 'text',
          };
        }
        // Heuristic fallback
        const norm = h.toLowerCase().replace(/[^a-z]/g, '');
        const match = KNOWN_FIELDS.find(f => f.key.replace(/_/g, '') === norm);
        return {
          csvHeader: h,
          target: match ? match.key : 'skip',
          newFieldLabel: h,
          newFieldType: 'text',
        };
      });

      setMappings(built);
      setStep(3);
    } catch {
      // Build basic mappings without AI
      const built: ColumnMapping[] = csvHeaders.map(h => {
        const norm = h.toLowerCase().replace(/[^a-z]/g, '');
        const match = KNOWN_FIELDS.find(f => f.key.replace(/_/g, '') === norm);
        return { csvHeader: h, target: match ? match.key : 'skip', newFieldLabel: h, newFieldType: 'text' };
      });
      setMappings(built);
      setStep(3);
    } finally {
      setMapping(false);
    }
  };

  const updateMapping = (idx: number, target: MappingTarget) => {
    setMappings(prev => prev.map((m, i) => i === idx ? { ...m, target } : m));
  };

  // ─── Step 4: Import ──────────────────────────────────────────────────────
  const runImport = async () => {
    setImporting(true);
    let imported = 0, skipped = 0, errors = 0;

    // Ensure new custom fields are created first
    const newFieldMappings = mappings.filter(m => m.target === 'new_custom_field');
    for (const m of newFieldMappings) {
      const key = m.newFieldLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const existing = customFields.find(f => f.field_key === key);
      if (!existing) {
        await supabase.from('client_custom_fields').insert({
          org_id: orgId,
          field_key: key,
          field_label: m.newFieldLabel,
          field_type: m.newFieldType || 'text',
          sort_order: customFields.length + newFieldMappings.indexOf(m),
        });
      }
      // Update mapping target to the actual key
      m.target = key;
    }

    const headerIndexMap: Record<string, number> = {};
    csvHeaders.forEach((h, i) => { headerIndexMap[h] = i; });

    for (const row of csvRows) {
      try {
        const clientPayload: Record<string, unknown> = {
          user_id: currentUserId,
          org_id: orgId,
          assigned_to: assignTo,
          client_type: 'buyer',
          status: 'lead',
          updated_at: new Date().toISOString(),
        };
        const customPayload: Record<string, string> = {};

        for (const m of mappings) {
          if (m.target === 'skip') continue;
          const colIdx = headerIndexMap[m.csvHeader];
          const val = row[colIdx]?.trim() || '';
          if (!val) continue;

          const isKnown = KNOWN_FIELDS.some(f => f.key === m.target);
          if (isKnown) {
            if (m.target === 'budget_min' || m.target === 'budget_max') {
              const n = parseFloat(val.replace(/[^0-9.]/g, ''));
              if (!isNaN(n)) clientPayload[m.target] = n;
            } else if (m.target === 'preferred_areas') {
              clientPayload[m.target] = val.split(',').map(s => s.trim()).filter(Boolean);
            } else {
              clientPayload[m.target] = val;
            }
          } else {
            customPayload[m.target] = val;
          }
        }

        if (!clientPayload.first_name && !clientPayload.last_name && !clientPayload.email) {
          skipped++;
          continue;
        }
        if (!clientPayload.first_name) clientPayload.first_name = 'Unknown';
        if (!clientPayload.last_name) clientPayload.last_name = '';

        // Dedup check by email within org
        if (clientPayload.email) {
          const { data: existing } = await supabase
            .from('clients').select('id')
            .eq('org_id', orgId).eq('email', clientPayload.email as string)
            .is('deleted_at', null).maybeSingle();
          if (existing) { skipped++; continue; }
        }

        const { data: inserted, error } = await supabase.from('clients').insert(clientPayload).select().single();
        if (error) throw error;

        // Write custom values
        for (const [key, value] of Object.entries(customPayload)) {
          if (!value) continue;
          await supabase.from('client_custom_values').insert({
            client_id: inserted.id, org_id: orgId, field_key: key, value,
          });
        }

        imported++;
      } catch {
        errors++;
      }
    }

    setSummary({ imported, skipped, errors });
    setStep(4);
    setImporting(false);
  };

  const getMemberDisplay = (userId: string) => {
    const m = orgMembers.find(o => o.user_id === userId);
    const email = m?.profile?.email || '';
    return m?.profile?.display_name || email.split('@')[0] || 'Unknown';
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="app-card rounded-xl shadow-lg w-full max-w-2xl mx-auto my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Import CSV</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Step {step} of 4 — {step === 1 ? 'Upload' : step === 2 ? 'Preview' : step === 3 ? 'Map Columns' : 'Done'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 transition-colors"
              >
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload a CSV file</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">First row must be column headers</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />

              {csvHeaders.length > 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                    <Check className="w-4 h-4" />
                    <span className="font-medium text-sm">File loaded</span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    {csvRows.length} rows · {csvHeaders.length} columns: {csvHeaders.join(', ')}
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  disabled={!csvHeaders.length}
                  onClick={() => setStep(2)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Preview of the first 5 rows. AI will suggest column mappings in the next step.</p>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {csvHeaders.map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {csvPreview.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        {csvHeaders.map((_, j) => (
                          <td key={j} className="px-3 py-2 text-gray-600 dark:text-gray-400 max-w-[160px] truncate">{row[j] || ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign all imported contacts to</label>
                <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm">
                  {orgMembers.map(m => (
                    <option key={m.user_id} value={m.user_id}>{getMemberDisplay(m.user_id)}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(1)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </button>
                <button onClick={runAiMapping} disabled={mapping}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60">
                  {mapping ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mapping…</> : <>Map Columns <ChevronRight className="w-4 h-4 ml-1" /></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review mappings */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Review and adjust the column mappings. "New Custom Field" creates a new org field for that column.</p>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {mappings.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300 w-40 flex-shrink-0 truncate" title={m.csvHeader}>{m.csvHeader}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <select
                      value={m.target}
                      onChange={e => updateMapping(idx, e.target.value as MappingTarget)}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white"
                    >
                      <option value="skip">— Skip —</option>
                      <optgroup label="Standard Fields">
                        {KNOWN_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                      </optgroup>
                      {customFields.length > 0 && (
                        <optgroup label="Existing Custom Fields">
                          {customFields.map(f => <option key={f.field_key} value={f.field_key}>{f.field_label}</option>)}
                        </optgroup>
                      )}
                      <option value="new_custom_field">+ New Custom Field</option>
                    </select>
                    {m.target === 'new_custom_field' && (
                      <input
                        type="text"
                        placeholder="Field name"
                        value={m.newFieldLabel}
                        onChange={e => setMappings(prev => prev.map((x, i) => i === idx ? { ...x, newFieldLabel: e.target.value } : x))}
                        className="w-32 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white"
                      />
                    )}
                  </div>
                ))}
              </div>

              {mappings.filter(m => m.target === 'new_custom_field' && !m.newFieldLabel.trim()).length > 0 && (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Please name all new custom fields.
                </div>
              )}

              <div className="flex justify-between">
                <button onClick={() => setStep(2)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </button>
                <button
                  onClick={runImport}
                  disabled={importing || mappings.filter(m => m.target === 'new_custom_field' && !m.newFieldLabel.trim()).length > 0}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
                >
                  {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</> : 'Import'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && summary && (
            <div className="space-y-5 text-center py-4">
              <Check className="w-12 h-12 text-green-500 mx-auto" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Import Complete</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">{summary.imported}</div>
                  <div className="text-xs text-green-600 dark:text-green-300 mt-1">Imported</div>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{summary.skipped}</div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">Skipped (dupes)</div>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400">{summary.errors}</div>
                  <div className="text-xs text-red-600 dark:text-red-300 mt-1">Errors</div>
                </div>
              </div>
              <button onClick={onImported}
                className="px-6 py-2.5 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
