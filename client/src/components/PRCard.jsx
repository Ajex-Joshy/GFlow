import React, { useState, useMemo } from 'react';
import {
  GitPullRequest,
  GitPullRequestDraft,
  GitMerge,
  MessageSquare,
  Check,
  X,
  Clock,
  FileCode2,
  Copy,
  Bell,
} from 'lucide-react';
import { getReviewSlaStatus, getCreatedSlaStatus, calculateElapsedHours } from '../utils/slaUtils';
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
  selectedOrg = 'all',
  showLabels = false,
  showDetailedTimestamp = false,
  showCIStatus = true,
  showReviewWaitTimer = false,
  showReviewerStatus = false,
  showDiffStats = false,
  settings = {},
  isSelected = false,
  cardRef = null,
}) {
  const isRaisedTab = tabType === 'raised';
  const isReviewerTab = tabType === 'reviewer';
  const isTeamTab = tabType === 'team';
  const isMerged = pr.state === 'MERGED' || Boolean(pr.mergedAt);
  const hasUnresolvedComments = (pr.unresolvedCommentsCount || 0) > 0;
  const createdFormatted = formatPRTimestamp(pr.createdAt);
  const reviewWaitTimerFormatted = formatDurationCompact(pr.reviewRequestedAt || pr.createdAt);
  const reviewSla = isReviewerTab ? getReviewSlaStatus(pr, settings) : null;
  const createdSla = (isRaisedTab || isTeamTab) ? getCreatedSlaStatus(pr, settings) : null;

  // When a specific single organization or personal is selected, omit duplicate owner name
  const repoDisplayName = useMemo(() => {
    const nameWithOwner = pr.repository?.nameWithOwner;
    if (!nameWithOwner) return pr.repository?.name || 'repository';

    // If "All Organizations & Personal" is selected, show full "owner/repo"
    if (selectedOrg === 'all') {
      return nameWithOwner;
    }

    // Single organization or personal selected: show repo name only
    if (pr.repository?.name) {
      return pr.repository.name;
    }
    const parts = nameWithOwner.split('/');
    return parts.length > 1 ? parts[1] : nameWithOwner;
  }, [pr.repository, selectedOrg]);
  const [copiedCheckout, setCopiedCheckout] = useState(false);
  const [copiedPing, setCopiedPing] = useState(false);

  // Extract pending reviewers who haven't approved yet
  const pendingReviewers = useMemo(() => {
    return pr.reviewers?.filter((r) => r.state !== 'APPROVED') || [];
  }, [pr.reviewers]);

  // Target reviewers who have actually been waiting (>= warning hours), leaving newly-added reviewers alone
  const targetReviewers = useMemo(() => {
    const warningHours = Number(settings?.reviewWarningHours) || 12;
    const overdue = pendingReviewers.filter((r) => {
      const waitDate = r.requestedAt || pr.reviewRequestedAt || pr.createdAt;
      const elapsed = calculateElapsedHours(waitDate, settings?.slaExcludedDays);
      return elapsed >= warningHours;
    });
    return overdue.length > 0 ? overdue : pendingReviewers;
  }, [pendingReviewers, settings?.reviewWarningHours, settings?.slaExcludedDays, pr.reviewRequestedAt, pr.createdAt]);

  const pendingReviewerSummary = useMemo(() => {
    if (targetReviewers.length > 0) {
      return targetReviewers.map((r) => `@${r.login}`).join(' ');
    }
    return 'team';
  }, [targetReviewers]);

  const handleCopyPingMessage = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const reviewerHandles = targetReviewers.length > 0
      ? targetReviewers.map((r) => `@${r.login}`).join(' ')
      : 'team';

    const prUrl = pr.url || (pr.repository?.nameWithOwner ? `https://github.com/${pr.repository.nameWithOwner}/pull/${pr.number}` : '');
    const durationText = createdSla?.formattedDuration ? ` (${createdSla.formattedDuration} elapsed)` : '';

    // Plain text format with direct URL
    const plainText = `Hey ${reviewerHandles}, gentle reminder to review PR #${pr.number}: "${pr.title}"${durationText} when you get a chance.\n${prUrl}`;

    // Rich text HTML format (creates a native clickable hyperlink in Slack, Teams, Email, Docs)
    const htmlText = `Hey ${reviewerHandles}, gentle reminder to review <a href="${prUrl}">PR #${pr.number}: &quot;${pr.title}&quot;</a>${durationText} when you get a chance.`;

    const onSuccess = () => {
      setCopiedPing(true);
      setTimeout(() => setCopiedPing(false), 2500);
    };

    if (navigator.clipboard?.write && typeof window.ClipboardItem !== 'undefined') {
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      const htmlBlob = new Blob([htmlText], { type: 'text/html' });

      navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': textBlob,
          'text/html': htmlBlob,
        }),
      ]).then(onSuccess).catch(() => {
        navigator.clipboard.writeText(plainText).then(onSuccess).catch((err) => {
          console.error('Failed to copy ping reminder', err);
        });
      });
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(plainText).then(onSuccess).catch((err) => {
        console.error('Failed to copy ping reminder', err);
      });
    }
  };

  const handleCopyCheckout = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(`gh pr checkout ${pr.number}`).then(() => {
        setCopiedCheckout(true);
        setTimeout(() => setCopiedCheckout(false), 2000);
      }).catch((err) => {
        console.error('Failed to copy checkout command', err);
      });
    }
  };

  return (
    <div className={`pr-row ${isSelected ? 'is-selected' : ''} ${reviewSla?.status === 'overdue' ? 'sla-overdue' : ''}`} ref={cardRef}>
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
          <div className="pr-number-box">
            <span className="pr-number-label">#{pr.number}</span>
            <button
              type="button"
              className={`gh-pr-copy-btn ${copiedCheckout ? 'copied' : ''}`}
              onClick={handleCopyCheckout}
              title={copiedCheckout ? 'Copied checkout command!' : `Copy 'gh pr checkout ${pr.number}' to clipboard`}
              aria-label={`Copy gh pr checkout ${pr.number}`}
            >
              {copiedCheckout ? (
                <Check size={11} strokeWidth={2.8} />
              ) : (
                <Copy size={11} />
              )}
            </button>

            {copiedCheckout && (
              <div className="gh-copy-popover" role="status" aria-live="polite">
                <Check size={12} strokeWidth={3} className="gh-copy-popover-check" />
                <span className="gh-copy-popover-title">Copied:</span>
                <code className="gh-copy-popover-cmd">gh pr checkout {pr.number}</code>
                <div className="gh-copy-popover-arrow" />
              </div>
            )}
          </div>

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
            title={pr.repository?.nameWithOwner || 'Repository'}
          >
            {repoDisplayName}
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
        {/* Reviewers Avatar Stack with Micro-Badges on Right Side (Raised & Team PRs) */}
        {(isRaisedTab || isTeamTab) && showReviewerStatus && pr.reviewers?.length > 0 && (
          <div className="reviewer-avatar-stack" aria-label="Reviewers">
            {pr.reviewers.map((rev) => (
              <div
                key={rev.login}
                className={`reviewer-avatar-item ${rev.state.toLowerCase()}`}
                title={getReviewerTooltip(rev, pr)}
              >
                {rev.avatarUrl ? (
                  <img src={rev.avatarUrl} alt={rev.login} className="reviewer-stack-avatar" />
                ) : (
                  <div className="reviewer-stack-avatar reviewer-fallback-avatar">
                    {rev.login?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className={`reviewer-micro-badge ${rev.state.toLowerCase()}`}>
                  {rev.state === 'APPROVED' ? (
                    <Check size={8} strokeWidth={3.5} />
                  ) : rev.state === 'CHANGES_REQUESTED' ? (
                    <X size={8} strokeWidth={3.5} />
                  ) : rev.state === 'COMMENTED' ? (
                    <MessageSquare size={7} strokeWidth={2.5} />
                  ) : (
                    <Clock size={7} strokeWidth={2.5} />
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Right-aligned Dynamic SLA Wait Timer (Reviewer Queue) */}
        {isReviewerTab && showReviewWaitTimer && reviewSla && (
          <div
            className={`sla-timer-chip ${reviewSla.status}`}
            title={reviewSla.tooltip}
          >
            <Clock size={12} className="sla-timer-icon" />
            <span className="sla-timer-time">{reviewSla.label}</span>
          </div>
        )}

        {/* Flag unresolved comments */}
        {(isRaisedTab || isTeamTab) && !isMerged && hasUnresolvedComments && (
          <span
            className="unresolved-badge"
            title={`${pr.unresolvedCommentsCount} unresolved review thread${pr.unresolvedCommentsCount > 1 ? 's' : ''}`}
          >
            <MessageSquare size={12} />
            <span>{pr.unresolvedCommentsCount} unresolved</span>
          </span>
        )}

        {/* 1-Click Ping Reviewers Action Button (Created & Team Stalled / Follow-up PRs) */}
        {(isRaisedTab || isTeamTab) && !isMerged && createdSla && (
          <div className="pr-ping-wrapper">
            <button
              type="button"
              className={`pr-ping-btn ${createdSla.status} ${copiedPing ? 'copied' : ''}`}
              onClick={handleCopyPingMessage}
              title={
                copiedPing
                  ? 'Copied ping message to clipboard!'
                  : `Click to copy polite ping reminder for reviewers (${createdSla.tooltip})`
              }
              aria-label={`Ping reviewers for PR ${pr.number}`}
            >
              {copiedPing ? (
                <>
                  <Check size={11} strokeWidth={2.8} />
                  <span>Ping Copied!</span>
                </>
              ) : (
                <>
                  <Bell size={11} className="pr-ping-icon" />
                  <span>
                    Ping {createdSla.formattedDuration ? `• ${createdSla.formattedDuration}` : 'Reviewers'}
                  </span>
                </>
              )}
            </button>

            {copiedPing && (
              <div className="gh-copy-popover ping-popover" role="status" aria-live="polite">
                <Check size={12} strokeWidth={3} className="gh-copy-popover-check" />
                <span className="gh-copy-popover-title">Copied reminder:</span>
                <span className="gh-copy-popover-sample">
                  &quot;Hey {pendingReviewerSummary}, gentle reminder on PR #{pr.number}...&quot;
                </span>
                <div className="gh-copy-popover-arrow" />
              </div>
            )}
          </div>
        )}

        {/* Total Comments if not showing unresolved */}
        {((!isRaisedTab && !isTeamTab) || isMerged) && pr.totalCommentsCount > 0 && (
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
