import React from 'react';
import BudgetControlDashboard from '../../components/BudgetControlDashboard';

const BudgetControlPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BudgetControlDashboard />
      </div>
    </div>
  );
};

export default BudgetControlPage;
