import React from 'react';

export const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export const ErrorBoundary = ({ children }) => {
  return <div>{children}</div>;
};

export const Avatar = ({ name, size = 'md', onClick, className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  return (
    <div 
      className={`bg-blue-500 rounded-full flex items-center justify-center text-white font-medium cursor-pointer ${sizeClasses[size]} ${className}`}
      onClick={onClick}
    >
      {name?.charAt(0)?.toUpperCase() || 'U'}
    </div>
  );
};

export const NotificationDropdown = () => (
  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
    <div className="w-5 h-5 bg-gray-400 rounded-full"></div>
  </button>
);

export default {
  LoadingSpinner,
  ErrorBoundary,
  Avatar,
  NotificationDropdown
};

export { default as BudgetControlDashboard } from './BudgetControlDashboard';
export { default as AssegnaOreModal } from './AssegnaOreModal';
export { default as CalcolaMarginiModal } from './CalcolaMarginiModal';
