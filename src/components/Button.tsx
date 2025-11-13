import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'white' | 'green';
  loading?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  loading = false,
  icon,
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}) => {
  // Base styles per Style Guide
  const baseStyles = 'inline-flex items-center justify-center font-bold text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 relative overflow-hidden';
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-2.5 lg:px-8 lg:py-4', // Per Style Guide: mobile py-2.5 px-6, desktop py-4 px-8
    lg: 'px-8 py-4 lg:px-10 lg:py-5 text-base'
  };

  const variantStyles = {
    // Primary CTA - Per Style Guide: #9EFAFF bg, #09364f text, yellow hover overlay
    primary: 'bg-[#9EFAFF] text-[#09364f] min-w-[160px] lg:min-w-[160px] w-full lg:w-auto focus:ring-[#9EFAFF]',
    // Secondary - Per Style Guide
    secondary: 'border-2 border-[#9EFAFF] text-[#09364f] bg-transparent hover:bg-[#9EFAFF] hover:bg-opacity-10 focus:ring-[#9EFAFF]',
    // White variant
    white: 'bg-white text-shortcut-blue border-2 border-[#9EFAFF] hover:bg-opacity-90 focus:ring-[#9EFAFF]',
    // Green variant - For approve/success actions, uses teal blue hover overlay
    green: 'bg-green-600 text-white min-w-[160px] lg:min-w-[160px] w-full lg:w-auto focus:ring-green-600 hover:bg-green-700 group-hover:text-[#09364f]'
  };

  const disabledStyles = 'opacity-50 cursor-not-allowed pointer-events-none';

  return (
    <button
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${loading || disabled ? disabledStyles : ''}
        ${variant === 'primary' || variant === 'green' ? 'group' : ''}
        ${className}
      `}
      disabled={loading || disabled}
      {...props}
    >
      {/* Yellow hover overlay - only for primary variant */}
      {variant === 'primary' && !disabled && (
        <span 
          className="absolute inset-0 bg-[#FEDC64] transform translate-y-full transition-all duration-300 ease-in rounded-[40px] group-hover:rounded-none group-hover:translate-y-0 pointer-events-none z-[1]"
          aria-hidden="true"
        />
      )}
      
      {/* Teal blue hover overlay - for green variant */}
      {variant === 'green' && !disabled && (
        <span 
          className="absolute inset-0 bg-[#9EFAFF] transform translate-y-full transition-all duration-300 ease-in rounded-[40px] group-hover:rounded-none group-hover:translate-y-0 pointer-events-none z-[1]"
          aria-hidden="true"
        />
      )}
      
      {/* Button content wrapper with z-index */}
      <span className={`relative z-[2] pointer-events-none flex items-center justify-center gap-2 ${variant === 'green' ? 'group-hover:text-[#09364f] transition-colors duration-300' : ''}`}>
      {loading ? (
        <>
            <LoadingSpinner size="small" />
          <span>Loading...</span>
        </>
      ) : (
        <>
            {icon && <span>{icon}</span>}
          {children}
        </>
      )}
      </span>
    </button>
  );
};