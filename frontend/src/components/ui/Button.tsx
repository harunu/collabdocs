import { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-accent text-white hover:bg-indigo-700': variant === 'primary',
          'bg-gray-100 text-gray-700 hover:bg-gray-200': variant === 'secondary',
          'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
          'text-gray-600 hover:bg-gray-100': variant === 'ghost',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
