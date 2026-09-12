import React from 'react';
import { Eye, GitPullRequest, CheckCircle2, MessageSquareWarning } from 'lucide-react';

export default function Tabs({ activeTab, onTabChange, counts = {} }) {
  const tabs = [
    {
      id: 'reviewer',
      label: 'PR where I am reviewer',
      icon: Eye,
      count: counts.reviewer || 0,
    },
    {
      id: 'raised',
      label: 'PR I raised',
      icon: GitPullRequest,
      count: counts.raised || 0,
      unresolvedCount: counts.totalUnresolvedRaisedComments || 0,
    },
    {
      id: 'approved',
      label: 'PR I approve',
      icon: CheckCircle2,
      count: counts.approved || 0,
    },
  ];

  return (
    <div className="tabs-container" role="tablist">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon size={18} />
            <span>{tab.label}</span>
            <span className="tab-badge">{tab.count}</span>

            {tab.id === 'raised' && tab.unresolvedCount > 0 && (
              <span
                className="tab-alert-pill"
                title={`${tab.unresolvedCount} unresolved comment thread${tab.unresolvedCount > 1 ? 's' : ''}`}
              >
                <MessageSquareWarning size={12} />
                <span>{tab.unresolvedCount}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
