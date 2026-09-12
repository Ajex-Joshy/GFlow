import React from 'react';
import {
  GitPullRequest,
  GitPullRequestDraft,
  MessageSquare,
  Check,
  Building2,
} from 'lucide-react';
import { formatPRTimestamp } from '../utils/dateFormatter';

export default function PRCard({ pr, tabType, userLogin }) {
  const isRaisedTab = tabType === 'raised';
  const isOrgTab = tabType === 'org';
  const hasUnresolvedComments = (pr.unresolvedCommentsCount || 0) > 0;
  const createdFormatted = formatPRTimestamp(pr.createdAt);
  const isOrgRepo = pr.repository?.owner && pr.repository?.owner !== userLogin;

  return (
    <div className="pr-row">
      {/* GitHub PR Status Icon (Green for open, gray for draft) */}
      <div className={`pr-status-icon ${pr.isDraft ? 'draft' : 'open'}`}>
        {pr.isDraft ? (
          <GitPullRequestDraft size={18} />
        ) : (
          <GitPullRequest size={18} />
        )}
      </div>

      {/* Main PR Content */}
      <div className="pr-row-content">
        <div className="pr-row-title-line">
          <a
            href={pr.url}
            target="_blank"
            rel="noopener noreferrer"
            className="pr-title-link"
          >
            {pr.title}
          </a>
          <span className="pr-number-label">#{pr.number}</span>

          {pr.isDraft && (
            <span className="gh-label gh-label-draft">Draft</span>
          )}

          {isOrgRepo && (
            <span
              className="gh-label"
              style={{
                backgroundColor: 'rgba(56, 139, 253, 0.12)',
                color: '#58a6ff',
                borderColor: 'rgba(56, 139, 253, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
              title={`Organization: ${pr.repository?.owner}`}
            >
              <Building2 size={11} />
              {pr.repository?.owner}
            </span>
          )}
        </div>

        {/* Secondary Meta Row: Repo, Exact timestamp, Opened by */}
        <div className="pr-row-meta-line">
          <a
            href={pr.repository?.url || `https://github.com/${pr.repository?.nameWithOwner}`}
            target="_blank"
            rel="noopener noreferrer"
            className="repo-link"
          >
            {pr.repository?.nameWithOwner || 'repository'}
          </a>

          <span>•</span>

          {/* User's specified exact timestamp format: Created: 1d 18h 1m ago (10 Sep, 11:37 PM) */}
          <span className="timestamp-text">
            <strong>{createdFormatted}</strong>
          </span>

          <span>•</span>

          <span>
            by{' '}
            <a
              href={pr.author?.url || `https://github.com/${pr.author?.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="author-link"
            >
              @{pr.author?.login}
            </a>
          </span>
        </div>
      </div>

      {/* Right Side: Unresolved Comments & Diff stats */}
      <div className="pr-row-right">
        {/* Unresolved Comments Badge (for raised PRs, and optionally org PRs) */}
        {(isRaisedTab || isOrgTab) && (
          <div>
            {hasUnresolvedComments ? (
              <span
                className="unresolved-badge"
                title={`${pr.unresolvedCommentsCount} unresolved review thread${pr.unresolvedCommentsCount > 1 ? 's' : ''}`}
              >
                <MessageSquare size={12} />
                <span>{pr.unresolvedCommentsCount} unresolved</span>
              </span>
            ) : (
              <span className="resolved-badge" title="All review threads resolved">
                <Check size={12} />
                <span>Resolved</span>
              </span>
            )}
          </div>
        )}

        {/* Total Comments if not showing unresolved */}
        {!isRaisedTab && !isOrgTab && pr.totalCommentsCount > 0 && (
          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-fg-muted)', fontSize: '12px' }}
            title={`${pr.totalCommentsCount} comments`}
          >
            <MessageSquare size={13} />
            <span>{pr.totalCommentsCount}</span>
          </span>
        )}

        {/* Additions / Deletions Diff */}
        {(pr.additions > 0 || pr.deletions > 0) && (
          <div className="diff-stat" title={`+${pr.additions} / -${pr.deletions}`}>
            <span className="diff-stat-add">+{pr.additions}</span>
            <span className="diff-stat-del">-{pr.deletions}</span>
          </div>
        )}
      </div>
    </div>
  );
}
