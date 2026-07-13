export const STANDARD_FIELDS: { key: string; label: string }[] = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip_code', label: 'ZIP Code' },
  { key: 'client_type', label: 'Client Type' },
  { key: 'status', label: 'Status' },
  { key: 'budget_min', label: 'Budget Min' },
  { key: 'budget_max', label: 'Budget Max' },
  { key: 'property_type', label: 'Property Type' },
  { key: 'source', label: 'Lead Source' },
  { key: 'notes', label: 'Notes' },
  { key: 'assigned_to_name', label: 'Assigned To' },
];

// Extract all {{field_key}} tokens from an HTML string
export function extractPlaceholders(html: string): string[] {
  const matches = html.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.slice(2, -2)))];
}

// Validate that all placeholders in html map to known fields; returns unknown keys
export function validatePlaceholders(
  html: string,
  knownFields: { key: string; label: string }[]
): string[] {
  const used = extractPlaceholders(html);
  const knownKeys = new Set(knownFields.map(f => f.key));
  return used.filter(k => !knownKeys.has(k));
}

// Resolve placeholders in html for a single client record
// Returns resolved html and list of keys that had no value
export function resolvePlaceholders(
  html: string,
  client: Record<string, any>,
  customValues: Record<string, string>,
  assignedToName?: string
): { resolved: string; missingKeys: string[] } {
  const used = extractPlaceholders(html);
  const missingKeys: string[] = [];

  const getValue = (key: string): string | null => {
    if (key === 'assigned_to_name') return assignedToName ?? null;
    const clientVal = client[key];
    if (clientVal !== undefined && clientVal !== null && clientVal !== '') {
      return String(clientVal);
    }
    const customVal = customValues[key];
    if (customVal !== undefined && customVal !== null && customVal !== '') {
      return String(customVal);
    }
    return null;
  };

  let resolved = html;
  for (const key of used) {
    const value = getValue(key);
    if (value === null) {
      missingKeys.push(key);
    }
    resolved = resolved.replaceAll(`{{${key}}}`, value ?? '');
  }

  return { resolved, missingKeys };
}

// For a list of contacts, return per-contact validation results
export interface ContactValidationResult {
  clientId: string;
  clientName: string;
  missingKeys: string[];
  canSend: boolean;
}

export function validateContactsForTemplate(
  html: string,
  contacts: Array<{ id: string; first_name: string; last_name: string; [key: string]: any }>,
  customValuesByClient: Record<string, Record<string, string>>,
  assignedToNames: Record<string, string>
): ContactValidationResult[] {
  const used = extractPlaceholders(html);
  if (used.length === 0) {
    return contacts.map(c => ({
      clientId: c.id,
      clientName: `${c.first_name} ${c.last_name}`.trim(),
      missingKeys: [],
      canSend: true,
    }));
  }

  return contacts.map(c => {
    const { missingKeys } = resolvePlaceholders(
      html,
      c,
      customValuesByClient[c.id] ?? {},
      assignedToNames[c.id]
    );
    return {
      clientId: c.id,
      clientName: `${c.first_name} ${c.last_name}`.trim(),
      missingKeys,
      canSend: missingKeys.length === 0,
    };
  });
}
