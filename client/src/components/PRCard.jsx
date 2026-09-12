import React from 'react';
import {
  GitPullRequest,
  GitPullRequestDraft,
  GitMerge,
  MessageSquare,
  Check,
  X,
  Clock,
} from 'lucide-react';
import { formatPRTimestamp, formatRelativeOnly } from '../utils/dateFormatter';

export default function PRCard({
  pr,
  tabType,
  showLabels = true,
  showDetailedTimestamp = true,
  showCIStatus = true,
  isSelected = false,
  cardRef = null,
}) {
  const isRaisedTab = tabType === 'raised';
  const isMerged = pr.state === 'MERGED' || Boolean(pr.mergedAt);
  const hasUnresolvedComments = (pr.unresolvedCommentsCount || 0) > 0;
  const createdFormatted = formatPRTimestamp(pr.createdAt);

  return (
    <div className={`pr-row ${isSelected ? 'is-selected' : ''}`} ref={cardRef}>
      {/* GitHub PR Status Icon (Green for open, purple for merged, gray for draft) */}
      <div className={`pr-status-icon ${isMerged ? 'merged' : pr.isDraft ? 'draft' : 'open'}`}>
        {isMerged ? (
          <GitMerge size={18} />
        ) : pr.isDraft ? (
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

          {isMerged ? (
            <span className="gh-label gh-label-merged">Merged</span>
          ) : pr.isDraft ? (
            <span className="gh-label gh-label-draft">Draft</span>
          ) : null}

          {/* GitHub Labels */}
          {showLabels && pr.labels?.map((label) => {
            const rawColor = label.color?.startsWith('#') ? label.color : `#${label.color || '6e7681'}`;
            return (
              <span
                key={label.name}
                className="gh-custom-label"
                style={{
                  backgroundColor: `${rawColor}20`,
                  color: rawColor,
                  borderColor: `${rawColor}50`,
                }}
                title={`Label: ${label.name}`}
              >
                {label.name}
              </span>
            );
          })}
        </div>

        {/* Secondary Meta Row: org/repo, Exact timestamp, Opened by */}
        <div className="pr-row-meta-line">
          <a
            href={pr.repository?.url || `https://github.com/${pr.repository?.nameWithOwner}`}
            target="_blank"
            rel="noopener noreferrer"
            className="repo-link"
            title="Repository"
          >
            {pr.repository?.nameWithOwner || 'repository'}
          </a>

          <span>•</span>

          {/* Timestamp: Detailed "Created: 2d 1h 52m ago (10 Sep, 4:58 PM)" or compact "opened 2d ago" */}
          <span className="timestamp-text">
            {showDetailedTimestamp ? (
              <strong>{createdFormatted}</strong>
            ) : (
              <span>opened {formatRelativeOnly(pr.createdAt)}</span>
            )}
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

          {isMerged && pr.mergedAt && (
            <>
              <span>•</span>
              <span style={{ color: 'var(--color-merged-fg)' }}>
                merged {formatRelativeOnly(pr.mergedAt)}
              </span>
            </>
          )}

          {/* CI / GitHub Actions Status Check (Native GitHub Style - icon only with tooltip) */}
          {showCIStatus && pr.checkState && (
            <>
              <span>•</span>
              <span
                className={`commit-build-status ${
                  pr.checkState === 'SUCCESS'
                    ? 'success'
                    : pr.checkState === 'FAILURE' || pr.checkState === 'ERROR'
                    ? 'failure'
                    : 'pending'
                }`}
                title={
                  pr.checkState === 'SUCCESS'
                    ? 'All checks have passed'
                    : pr.checkState === 'FAILURE' || pr.checkState === 'ERROR'
                    ? 'Some checks were not successful'
                    : 'Some checks haven’t completed yet'
                }
              >
                {pr.checkState === 'SUCCESS' ? (
                  <Check size={14} strokeWidth={2.5} />
                ) : pr.checkState === 'FAILURE' || pr.checkState === 'ERROR' ? (
                  <X size={14} strokeWidth={2.5} />
                ) : (
                  <Clock size={13} strokeWidth={2} />
                )}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right Side: Unresolved Comments & Diff stats */}
      <div className="pr-row-right">
        {/* Unresolved Comments Badge (Specifically for open PRs I raised) */}
        {isRaisedTab && !isMerged && (
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
        {(!isRaisedTab || isMerged) && pr.totalCommentsCount > 0 && (
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
