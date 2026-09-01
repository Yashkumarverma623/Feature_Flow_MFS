import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', icon, className = '', disabled, ...props }, ref) => {
    const baseStyle =
      'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants = {
      primary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-transparent shadow-sm',
      secondary: 'bg-zinc-900 text-zinc-200 hover:bg-zinc-800 border border-zinc-800',
      outline: 'bg-transparent text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-800',
      danger: 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-800/50',
      ghost: 'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 border border-transparent',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1 gap-1.5 h-7',
      md: 'text-xs px-3.5 py-1.5 gap-2 h-8',
      lg: 'text-sm px-4 py-2 gap-2 h-9',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
