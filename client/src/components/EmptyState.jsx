import React from 'react';
import { GitPullRequest, Check } from 'lucide-react';

export default function EmptyState({ tabType, searchQuery }) {
  if (searchQuery) {
    return (
      <div className="gh-blankslate">
        <div className="gh-blankslate-icon">
          <GitPullRequest size={32} />
        </div>
        <h3 className="gh-blankslate-heading">No results matched your search</h3>
        <p className="gh-blankslate-text">
          Could not find any pull requests matching &quot;{searchQuery}&quot;. Try searching for another repository or title.
        </p>
      </div>
    );
  }

  const tabMessages = {
    reviewer: {
      title: 'There aren’t any pull requests waiting on your review.',
      desc: 'When someone requests your review on a pull request, it will appear here.',
    },
    raised: {
      title: 'There aren’t any open pull requests created by you.',
      desc: 'Pull requests you open across any repository will be tracked here.',
    },
    approved: {
      title: 'There aren’t any pull requests you have approved.',
      desc: 'Pull requests that you have reviewed and approved will show up here.',
    },
  };

  const info = tabMessages[tabType] || {
    title: 'No pull requests found',
    desc: 'There are no pull requests to display.',
  };

  return (
    <div className="gh-blankslate">
      <div className="gh-blankslate-icon">
        <Check size={32} style={{ color: 'var(--color-open-fg)' }} />
      </div>
      <h3 className="gh-blankslate-heading">{info.title}</h3>
      <p className="gh-blankslate-text">{info.desc}</p>
    </div>
  );
}
