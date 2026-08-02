import { useState } from 'react';
import Customers from './Customers';
import Orders from './Orders';

const tabs = [
  { key: 'orders', label: 'Orders', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> },
  { key: 'customers', label: 'Customers', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
];

export default function CustomersOrders() {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 bg-accent-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-black-400 hover:text-black-700'
            }`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && <Orders />}
      {activeTab === 'customers' && <Customers />}
    </div>
  );
}
