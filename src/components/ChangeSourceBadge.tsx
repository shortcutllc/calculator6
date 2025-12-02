import React from 'react';
import { User, Briefcase } from 'lucide-react';

interface ChangeSourceBadgeProps {
  changeSource?: string | null;
  userId?: string | null;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Badge component to display the source of proposal changes.
 * Shows "Client" for client changes and "Shortcut Staff" for admin/staff changes.
 * Auto-detects source for historical proposals without change_source by checking userId.
 */
export const ChangeSourceBadge: React.FC<ChangeSourceBadgeProps> = ({
  changeSource,
  userId,
  className = '',
  size = 'sm'
}) => {
  // Auto-detect source for historical proposals
  const source = changeSource || (userId ? 'staff' : 'client');
  
  const isClient = source === 'client';
  const isStaff = source === 'staff' || source === 'admin';
  
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-1 text-xs' 
    : 'px-3 py-1.5 text-sm';
  
  if (isClient) {
    return (
      <span className={`inline-flex items-center gap-1 bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue ${sizeClasses} rounded-full font-bold ${className}`}>
        <User size={size === 'sm' ? 12 : 14} />
        Client
      </span>
    );
  }
  
  if (isStaff) {
    return (
      <span className={`inline-flex items-center gap-1 bg-shortcut-navy-blue bg-opacity-10 text-text-dark ${sizeClasses} rounded-full font-bold ${className}`}>
        <Briefcase size={size === 'sm' ? 12 : 14} />
        Shortcut Staff
      </span>
    );
  }
  
  // Fallback for unknown sources
  return (
    <span className={`inline-flex items-center gap-1 bg-neutral-light-gray text-text-dark-60 ${sizeClasses} rounded-full font-bold ${className}`}>
      Unknown
    </span>
  );
};

export default ChangeSourceBadge;

