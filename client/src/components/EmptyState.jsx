import React from 'react';
import { GitPullRequest, Check, Building2, MessageSquare } from 'lucide-react';

export default function EmptyState({ tabType, searchQuery, selectedOrg, selectedRepo, onlyUnresolved }) {
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

  if (onlyUnresolved) {
    return (
      <div className="gh-blankslate">
        <div className="gh-blankslate-icon">
          <Check size={32} style={{ color: 'var(--color-open-fg)' }} />
        </div>
        <h3 className="gh-blankslate-heading">No unresolved comments</h3>
        <p className="gh-blankslate-text">
          All review comments have been resolved across your open pull requests.
        </p>
      </div>
    );
  }

  if (selectedRepo && selectedRepo !== 'all') {
    const repoShort = selectedRepo.includes('/') ? selectedRepo.split('/')[1] : selectedRepo;
    return (
      <div className="gh-blankslate">
        <div className="gh-blankslate-icon">
          <GitPullRequest size={32} />
        </div>
        <h3 className="gh-blankslate-heading">No pull requests for {repoShort}</h3>
        <p className="gh-blankslate-text">
          There are no pull requests in this tab matching the repository &quot;{repoShort}&quot;.
        </p>
      </div>
    );
  }

  if (selectedOrg && selectedOrg !== 'all') {
    return (
      <div className="gh-blankslate">
        <div className="gh-blankslate-icon">
          <Building2 size={32} />
        </div>
        <h3 className="gh-blankslate-heading">No pull requests found for {selectedOrg}</h3>
        <p className="gh-blankslate-text">
          There are no pull requests in this tab matching the selected organization filter.
        </p>
      </div>
    );
  }

  const tabMessages = {
    reviewer: {
      title: 'There aren’t any pull requests waiting on your review.',
      desc: 'When someone requests your review on a pull request (individually or via an organization team), it will appear here.',
    },
    raised: {
      title: 'There aren’t any open pull requests created by you.',
      desc: 'Pull requests you open across your personal and organization repositories will be tracked here.',
    },
    approved: {
      title: 'There aren’t any pull requests you have approved.',
      desc: 'Pull requests that you have reviewed and approved will show up here.',
    },
    org: {
      title: 'No open pull requests found across your organizations.',
      desc: 'Pull requests opened by your teammates across your organizations will show up here.',
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
