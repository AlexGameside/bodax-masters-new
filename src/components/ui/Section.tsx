import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({ children, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  );
};

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  action,
  className = ''
}) => {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div className="flex items-center space-x-3">
        {Icon && (
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/20">
            <Icon className="w-5 h-5 text-pink-400" />
          </div>
        )}
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white font-mono tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

interface SectionContentProps {
  children: React.ReactNode;
  className?: string;
}

export const SectionContent: React.FC<SectionContentProps> = ({ children, className = '' }) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

