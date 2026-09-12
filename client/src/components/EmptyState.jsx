import React from 'react';
import { Inbox, CheckCircle2 } from 'lucide-react';

export default function EmptyState({ tabType, searchQuery }) {
  if (searchQuery) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Inbox size={26} />
        </div>
        <h3 className="empty-state-title">No matching Pull Requests</h3>
        <p className="empty-state-desc">
          No pull requests found matching &quot;{searchQuery}&quot;. Try adjusting your search query.
        </p>
      </div>
    );
  }

  const tabMessages = {
    reviewer: {
      title: 'Inbox Zero! No PRs awaiting your review',
      desc: 'You have no pending review requests at the moment. Great job keeping the review queue clean!',
    },
    raised: {
      title: 'No open PRs raised by you',
      desc: 'You do not have any active pull requests authored right now. Create a new branch and open a PR on GitHub.',
    },
    approved: {
      title: 'No approved PRs found',
      desc: 'Pull requests that you review and approve will appear here for easy tracking.',
    },
  };

  const info = tabMessages[tabType] || {
    title: 'No Pull Requests found',
    desc: 'There are no pull requests to display in this view.',
  };

  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <CheckCircle2 size={26} style={{ color: 'var(--status-open)' }} />
      </div>
      <h3 className="empty-state-title">{info.title}</h3>
      <p className="empty-state-desc">{info.desc}</p>
    </div>
  );
}
