import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && <label className="block text-xs font-medium text-zinc-400">{label}</label>}
        <select
          ref={ref}
          className={`w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-zinc-900 text-zinc-100">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';
