import React from 'react';
import {
  ExternalLink,
  GitBranch,
  Clock,
  MessageSquareWarning,
  CheckCircle2,
  FileCode,
  GitPullRequestDraft,
  GitPullRequest,
} from 'lucide-react';
import { formatPRTimestamp, formatRelativeOnly } from '../utils/dateFormatter';

export default function PRCard({ pr, tabType }) {
  const isRaisedTab = tabType === 'raised';
  const hasUnresolvedComments = (pr.unresolvedCommentsCount || 0) > 0;
  const createdFormatted = formatPRTimestamp(pr.createdAt);

  return (
    <article className="pr-card">
      {/* Header: Repository & Status Badges */}
      <div className="pr-card-header">
        <a
          href={pr.repository?.url || `https://github.com/${pr.repository?.nameWithOwner}`}
          target="_blank"
          rel="noopener noreferrer"
          className="repo-pill"
          title="Open repository on GitHub"
        >
          <GitBranch size={13} />
          <span>{pr.repository?.nameWithOwner || 'repository'}</span>
        </a>

        <div className="pr-badges-row">
          {/* Creation Timestamp formatted exactly: Created: 1d 18h 1m ago (10 Sep, 11:37 PM) */}
          <div className="timestamp-pill" title={`Created on ${new Date(pr.createdAt).toLocaleString()}`}>
            <Clock size={13} style={{ color: 'var(--text-muted)' }} />
            <span>{createdFormatted}</span>
          </div>

          {/* Draft or Open Badge */}
          {pr.isDraft ? (
            <span className="badge-draft">
              <GitPullRequestDraft size={12} />
              Draft
            </span>
          ) : (
            <span className="badge-open">
              <GitPullRequest size={12} />
              Open
            </span>
          )}
        </div>
      </div>

      {/* Main PR Title & Link */}
      <div className="pr-title-row">
        <a
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
          className="pr-title"
        >
          <span>{pr.title}</span>
          <span className="pr-number">#{pr.number}</span>
          <ExternalLink size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
        </a>
      </div>

      {/* Unresolved Comments Pill (Specifically for PR I raised) */}
      {isRaisedTab && (
        <div style={{ marginBottom: '0.85rem' }}>
          {hasUnresolvedComments ? (
            <div className="unresolved-alert-pill">
              <MessageSquareWarning size={14} />
              <span>
                {pr.unresolvedCommentsCount} Unresolved Comment{pr.unresolvedCommentsCount > 1 ? 's' : ''}
              </span>
            </div>
          ) : (
            <div className="resolved-pill">
              <CheckCircle2 size={14} />
              <span>All Comments Resolved</span>
            </div>
          )}
        </div>
      )}

      {/* Card Footer: Author info, diff stats, labels */}
      <footer className="pr-card-footer">
        <div className="author-info">
          <img
            src={pr.author?.avatarUrl}
            alt={pr.author?.login}
            className="author-avatar"
          />
          <span>Opened by</span>
          <a
            href={pr.author?.url || `https://github.com/${pr.author?.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="author-link"
          >
            @{pr.author?.login}
          </a>

          {tabType === 'approved' && pr.approvedAt && (
            <span style={{ color: 'var(--status-open)', marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <CheckCircle2 size={13} />
              Approved {formatRelativeOnly(pr.approvedAt)}
            </span>
          )}
        </div>

        <div className="pr-meta-stats">
          {/* Changed Files */}
          {pr.changedFiles > 0 && (
            <span title={`${pr.changedFiles} files changed`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <FileCode size={13} />
              {pr.changedFiles} files
            </span>
          )}

          {/* Additions / Deletions Diff */}
          {(pr.additions > 0 || pr.deletions > 0) && (
            <div className="diff-stats" title={`+${pr.additions} / -${pr.deletions} lines`}>
              <span className="diff-add">+{pr.additions}</span>
              <span className="diff-del">-{pr.deletions}</span>
            </div>
          )}
        </div>
      </footer>
    </article>
  );
}
