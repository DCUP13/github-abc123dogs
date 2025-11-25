import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={`w-11 h-6 rounded-full transition-colors ${
            checked
              ? 'bg-blue-600'
              : 'bg-gray-300 dark:bg-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </div>
      </div>
      {label && (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {label}
        </span>
      )}
    </label>
  );
}
