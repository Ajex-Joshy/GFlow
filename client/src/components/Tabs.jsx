import React from 'react';
import { Eye, GitPullRequest, Users, CheckCircle2 } from 'lucide-react';

export default function Tabs({
  activeTab,
  onTabChange,
  counts = {},
  showApprovedTab = true,
  showTeamTab = true,
}) {
  const allTabs = [
    {
      id: 'reviewer',
      label: 'Review Requests',
      icon: Eye,
      count: counts.reviewer || 0,
    },
    {
      id: 'raised',
      label: 'Created',
      icon: GitPullRequest,
      count: counts.raised || 0,
      unresolvedCount: counts.totalUnresolvedRaisedComments || 0,
      unresolvedPRsCount: counts.unresolvedRaisedPRsCount || 0,
    },
    {
      id: 'team',
      label: 'Team PRs',
      icon: Users,
      count: counts.team || 0,
      stalledCount: counts.teamStalledPRsCount || 0,
    },
    {
      id: 'approved',
      label: 'Approved',
      icon: CheckCircle2,
      count: counts.approved || 0,
    },
  ];

  const tabs = allTabs.filter((t) => {
    if (t.id === 'approved' && !showApprovedTab) return false;
    if (t.id === 'team' && !showTeamTab) return false;
    return true;
  });

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

            {tab.id === 'raised' && tab.unresolvedPRsCount > 0 && (
              <span
                className="unresolved-counter-pill"
                title={`${tab.unresolvedPRsCount} open PR${tab.unresolvedPRsCount > 1 ? 's have' : ' has'} ${tab.unresolvedCount} unresolved comment thread${tab.unresolvedCount > 1 ? 's' : ''}`}
              >
                {tab.unresolvedPRsCount} unresolved
              </span>
            )}

            {tab.id === 'team' && tab.stalledCount > 0 && (
              <span
                className="stalled-counter-pill"
                title={`${tab.stalledCount} team PR${tab.stalledCount > 1 ? 's have' : ' has'} breached SLA turnaround limits`}
              >
                {tab.stalledCount} stalled
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
