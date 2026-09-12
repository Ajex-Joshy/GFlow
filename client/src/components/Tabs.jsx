import React from 'react';
import { Eye, GitPullRequest, CheckCircle2 } from 'lucide-react';

export default function Tabs({ activeTab, onTabChange, counts = {}, showApprovedTab = true }) {
  const allTabs = [
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

  const tabs = showApprovedTab ? allTabs : allTabs.filter((t) => t.id !== 'approved');

  return (
    <nav className="underlinenav-container" aria-label="Pull Request Navigation">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            className={`underlinenav-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
            <span className="gh-counter">{tab.count}</span>

            {tab.id === 'raised' && tab.unresolvedCount > 0 && (
              <span
                className="unresolved-counter-pill"
                title={`${tab.unresolvedCount} unresolved comment thread${tab.unresolvedCount > 1 ? 's' : ''}`}
              >
                {tab.unresolvedCount} unresolved
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
