import React from 'react';
import {
  GitPullRequest,
  GitPullRequestDraft,
  GitMerge,
  MessageSquare,
  Check,
  X,
  Clock,
  FileCode2,
} from 'lucide-react';
import {
  formatPRTimestamp,
  formatRelativeOnly,
  formatDurationCompact,
  formatDurationAgo,
} from '../utils/dateFormatter';

function getReviewerTooltip(rev, pr) {
  const name = rev.login ? `@${rev.login}: ` : '';
  if (rev.state === 'APPROVED') {
    const time = rev.submittedAt ? formatRelativeOnly(rev.submittedAt) : 'recently';
    return `${name}approved ${time}`;
  }
  if (rev.state === 'CHANGES_REQUESTED') {
    const time = rev.submittedAt ? formatRelativeOnly(rev.submittedAt) : 'recently';
    return `${name}requested changes ${time}`;
  }
  if (rev.state === 'COMMENTED') {
    const time = rev.submittedAt ? formatRelativeOnly(rev.submittedAt) : 'recently';
    return `${name}commented ${time}`;
  }
  const waitTime = formatDurationAgo(rev.requestedAt || pr.reviewRequestedAt || pr.createdAt);
  return `${name}requested ${waitTime}`;
}

export default function PRCard({
  pr,
  tabType,
  showLabels = true,
  showDetailedTimestamp = true,
  showCIStatus = true,
  showReviewWaitTimer = true,
  showReviewerStatus = true,
  showDiffStats = true,
  isSelected = false,
  cardRef = null,
}) {
  const isRaisedTab = tabType === 'raised';
  const isReviewerTab = tabType === 'reviewer';
  const isMerged = pr.state === 'MERGED' || Boolean(pr.mergedAt);
  const hasUnresolvedComments = (pr.unresolvedCommentsCount || 0) > 0;
  const createdFormatted = formatPRTimestamp(pr.createdAt);
  const reviewWaitTimerFormatted = formatDurationCompact(pr.reviewRequestedAt || pr.createdAt);

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

          {pr.isDraft && (
            <span className="gh-label gh-label-draft">Draft</span>
          )}

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
            <span className="meta-ci-wrapper">
              <span className="meta-bullet">•</span>
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
            </span>
          )}
        </div>
      </div>

      {/* Right Side: Reviewers (Raised tab), SLA Wait Timer (Reviewer tab), Unresolved Comments & Diff stats */}
      <div className="pr-row-right">
        {/* Reviewers Decision Chips on Right Side (Raised PRs) */}
        {isRaisedTab && showReviewerStatus && pr.reviewers?.length > 0 && (
          <div className="pr-reviewers-chips">
            {pr.reviewers.map((rev) => (
              <span
                key={rev.login}
                className={`reviewer-status-chip ${rev.state.toLowerCase()}`}
                title={getReviewerTooltip(rev, pr)}
              >
                {rev.avatarUrl && (
                  <img src={rev.avatarUrl} alt={rev.login} className="reviewer-chip-avatar" />
                )}
                <span className="reviewer-chip-name">{rev.login}</span>
                {rev.state === 'APPROVED' ? (
                  <Check size={11} strokeWidth={2.8} className="reviewer-status-icon approved" />
                ) : rev.state === 'CHANGES_REQUESTED' ? (
                  <X size={11} strokeWidth={2.8} className="reviewer-status-icon changes-requested" />
                ) : rev.state === 'COMMENTED' ? (
                  <MessageSquare size={10} className="reviewer-status-icon commented" />
                ) : (
                  <Clock size={10} className="reviewer-status-icon pending" />
                )}
              </span>
            ))}
          </div>
        )}

        {/* Right-aligned SLA Wait Timer (Reviewer Queue) */}
        {isReviewerTab && showReviewWaitTimer && (
          <div
            className="sla-timer-chip"
            title={`Review requested ${formatDurationAgo(pr.reviewRequestedAt || pr.createdAt)}`}
          >
            <Clock size={12} className="sla-timer-icon" />
            <span className="sla-timer-time">{reviewWaitTimerFormatted}</span>
          </div>
        )}

        {/* Flag unresolved comments only */}
        {isRaisedTab && !isMerged && hasUnresolvedComments && (
          <span
            className="unresolved-badge"
            title={`${pr.unresolvedCommentsCount} unresolved review thread${pr.unresolvedCommentsCount > 1 ? 's' : ''}`}
          >
            <MessageSquare size={12} />
            <span>{pr.unresolvedCommentsCount} unresolved</span>
          </span>
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

        {/* Combined Files & Lines Diff Stats */}
        {showDiffStats && (pr.changedFiles > 0 || pr.additions > 0 || pr.deletions > 0) && (
          <div
            className="diff-stat-combined"
            title={`${pr.changedFiles || 0} file${pr.changedFiles === 1 ? '' : 's'} changed (+${(pr.additions || 0).toLocaleString()} / -${(pr.deletions || 0).toLocaleString()})`}
          >
            {pr.changedFiles > 0 && (
              <span className="diff-files-pill">
                <FileCode2 size={11} className="diff-files-icon" />
                <span>{pr.changedFiles} {pr.changedFiles === 1 ? 'file' : 'files'}</span>
              </span>
            )}
            {pr.changedFiles > 0 && (pr.additions > 0 || pr.deletions > 0) && (
              <span className="diff-stat-dot">•</span>
            )}
            {(pr.additions > 0 || pr.deletions > 0) && (
              <span className="diff-lines-pill">
                <span className="diff-stat-add">+{pr.additions.toLocaleString()}</span>
                <span className="diff-stat-del">-{pr.deletions.toLocaleString()}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
