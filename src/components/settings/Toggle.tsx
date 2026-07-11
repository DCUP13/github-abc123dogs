import React from 'react';
import type { ToggleProps } from './types';

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-200 dark:bg-gray-700'
      }`}
      style={checked ? { backgroundColor: 'var(--accent)' } : undefined}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}