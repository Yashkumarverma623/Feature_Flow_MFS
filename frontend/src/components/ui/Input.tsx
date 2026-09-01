import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  mono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, mono = false, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && <label className="block text-xs font-medium text-zinc-400">{label}</label>}
        <input
          ref={ref}
          className={`w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors ${
            mono ? 'font-mono' : ''
          } ${error ? 'border-rose-800 focus:border-rose-500' : ''} ${className}`}
          {...props}
        />
        {error && <p className="text-[11px] text-rose-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
