import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full px-2.5 py-0.5 transition-colors';
  
  const variantClasses = {
    default: 'bg-gray-700/50 text-gray-300 border border-gray-600/50',
    success: 'bg-green-900/50 text-green-400 border border-green-700/50',
    warning: 'bg-yellow-900/50 text-yellow-400 border border-yellow-700/50',
    error: 'bg-red-900/50 text-red-400 border border-red-700/50',
    info: 'bg-blue-900/50 text-blue-400 border border-blue-700/50',
    primary: 'bg-pink-900/50 text-pink-400 border border-pink-700/50',
    secondary: 'bg-cyan-900/50 text-cyan-400 border border-cyan-700/50',
  };
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
};

interface StatusBadgeProps {
  status: 'approved' | 'rejected' | 'pending' | 'registered' | 'live' | 'completed' | 'scheduled' | 'playing';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const statusConfig = {
    approved: { variant: 'success' as const, label: 'Approved' },
    rejected: { variant: 'error' as const, label: 'Rejected' },
    pending: { variant: 'warning' as const, label: 'Pending' },
    registered: { variant: 'info' as const, label: 'Registered' },
    live: { variant: 'error' as const, label: 'LIVE' },
    completed: { variant: 'success' as const, label: 'Completed' },
    scheduled: { variant: 'info' as const, label: 'Scheduled' },
    playing: { variant: 'warning' as const, label: 'Playing' },
  };
  
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
};


