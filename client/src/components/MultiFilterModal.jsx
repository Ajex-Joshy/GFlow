import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  Check,
  RotateCcw,
  GitFork,
  User,
  Users,
  Eye,
  Tag,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';
import { getReviewSlaStatus, getCreatedSlaStatus } from '../utils/slaUtils';

export default function MultiFilterModal({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onResetFilters,
  prPool = [],
  settings = {},
}) {
  const [activeCategory, setActiveCategory] = useState('repositories');
  const [categorySearch, setCategorySearch] = useState('');

  // Reset category search when switching tabs or reopening
  useEffect(() => {
    setCategorySearch('');
  }, [activeCategory, isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Extract all available filter options with dynamic live PR counts from prPool
  const categoryData = useMemo(() => {
    const reposMap = new Map();
    const authorsMap = new Map();
    const assigneesMap = new Map();
    const reviewersMap = new Map();
    const labelsMap = new Map();

    const slaCounts = {
      overdue: 0,
      stalled: 0,
      'due-soon': 0,
      healthy: 0,
    };

    (prPool || []).forEach((pr) => {
      // 1. Repositories
      const repoKey = pr.repository?.nameWithOwner || pr.repository?.name;
      if (repoKey) {
        const existing = reposMap.get(repoKey) || {
          id: repoKey,
          label: repoKey.includes('/') ? repoKey.split('/')[1] : repoKey,
          fullName: repoKey,
          count: 0,
        };
        existing.count += 1;
        reposMap.set(repoKey, existing);
      }

      // 2. Authors
      const authorLogin = pr.author?.login;
      if (authorLogin) {
        const existing = authorsMap.get(authorLogin) || {
          id: authorLogin,
          label: authorLogin,
          avatarUrl: pr.author?.avatarUrl,
          count: 0,
        };
        existing.count += 1;
        authorsMap.set(authorLogin, existing);
      }

      // 3. Assignees
      (pr.assignees || []).forEach((assignee) => {
        if (!assignee?.login) return;
        const existing = assigneesMap.get(assignee.login) || {
          id: assignee.login,
          label: assignee.login,
          avatarUrl: assignee.avatarUrl,
          count: 0,
        };
        existing.count += 1;
        assigneesMap.set(assignee.login, existing);
      });

      // 4. Reviewers
      (pr.reviewers || []).forEach((rev) => {
        const revLogin = rev?.login || rev?.name;
        if (!revLogin) return;
        const existing = reviewersMap.get(revLogin) || {
          id: revLogin,
          label: revLogin,
          avatarUrl: rev.avatarUrl,
          count: 0,
        };
        existing.count += 1;
        reviewersMap.set(revLogin, existing);
      });

      // 5. Labels
      (pr.labels || []).forEach((lbl) => {
        if (!lbl?.name) return;
        const existing = labelsMap.get(lbl.name) || {
          id: lbl.name,
          label: lbl.name,
          color: lbl.color,
          count: 0,
        };
        existing.count += 1;
        labelsMap.set(lbl.name, existing);
      });

      // 6. SLA Urgency
      const reviewSla = getReviewSlaStatus(pr, settings);
      const createdSla = getCreatedSlaStatus(pr, settings);

      if (reviewSla?.status === 'overdue' || createdSla?.status === 'stalled') {
        if (reviewSla?.status === 'overdue') slaCounts.overdue += 1;
        if (createdSla?.status === 'stalled') slaCounts.stalled += 1;
      } else if (reviewSla?.status === 'due-soon' || createdSla?.status === 'follow-up') {
        slaCounts['due-soon'] += 1;
      } else {
        slaCounts.healthy += 1;
      }
    });

    const slaOptions = [
      {
        id: 'overdue',
        label: 'Overdue Review Request (>24h)',
        badgeColor: 'var(--color-danger-fg)',
        count: slaCounts.overdue,
      },
      {
        id: 'stalled',
        label: 'Stalled PR Awaiting Review (>48h)',
        badgeColor: 'var(--color-danger-fg)',
        count: slaCounts.stalled,
      },
      {
        id: 'due-soon',
        label: 'Due Soon / Follow-up (>12h)',
        badgeColor: 'var(--color-attention-fg)',
        count: slaCounts['due-soon'],
      },
      {
        id: 'healthy',
        label: 'Healthy / On Track',
        badgeColor: 'var(--color-open-fg)',
        count: slaCounts.healthy,
      },
    ];

    return {
      repositories: Array.from(reposMap.values()).sort((a, b) => b.count - a.count),
      authors: Array.from(authorsMap.values()).sort((a, b) => b.count - a.count),
      assignees: Array.from(assigneesMap.values()).sort((a, b) => b.count - a.count),
      reviewers: Array.from(reviewersMap.values()).sort((a, b) => b.count - a.count),
      labels: Array.from(labelsMap.values()).sort((a, b) => b.count - a.count),
      slaUrgency: slaOptions,
    };
  }, [prPool, settings]);

  if (!isOpen) return null;

  const categories = [
    {
      id: 'repositories',
      label: 'Repositories',
      icon: GitFork,
      count: filters.repositories?.length || 0,
      totalAvailable: categoryData.repositories.length,
    },
    {
      id: 'authors',
      label: 'Authors',
      icon: User,
      count: filters.authors?.length || 0,
      totalAvailable: categoryData.authors.length,
    },
    {
      id: 'assignees',
      label: 'Assignees',
      icon: Users,
      count: filters.assignees?.length || 0,
      totalAvailable: categoryData.assignees.length,
    },
    {
      id: 'reviewers',
      label: 'Reviewers',
      icon: Eye,
      count: filters.reviewers?.length || 0,
      totalAvailable: categoryData.reviewers.length,
    },
    {
      id: 'labels',
      label: 'Labels',
      icon: Tag,
      count: filters.labels?.length || 0,
      totalAvailable: categoryData.labels.length,
    },
    {
      id: 'slaUrgency',
      label: 'SLA Urgency',
      icon: Clock,
      count: filters.slaUrgency?.length || 0,
      totalAvailable: categoryData.slaUrgency.length,
    },
  ];

  const currentOptions = categoryData[activeCategory] || [];
  const selectedInCurrentCategory = filters[activeCategory] || [];

  const filteredOptions = currentOptions.filter((opt) => {
    if (!categorySearch.trim()) return true;
    const q = categorySearch.toLowerCase().trim();
    return (
      opt.label?.toLowerCase().includes(q) ||
      opt.id?.toLowerCase().includes(q) ||
      opt.fullName?.toLowerCase().includes(q)
    );
  });

  const handleToggleOption = (id) => {
    const isSelected = selectedInCurrentCategory.includes(id);
    const updated = isSelected
      ? selectedInCurrentCategory.filter((item) => item !== id)
      : [...selectedInCurrentCategory, id];

    onFiltersChange({
      ...filters,
      [activeCategory]: updated,
    });
  };

  const handleSelectAllCurrent = () => {
    const allFilteredIds = filteredOptions.map((opt) => opt.id);
    const combined = Array.from(new Set([...selectedInCurrentCategory, ...allFilteredIds]));
    onFiltersChange({
      ...filters,
      [activeCategory]: combined,
    });
  };

  const handleClearCurrentCategory = () => {
    onFiltersChange({
      ...filters,
      [activeCategory]: [],
    });
  };

  const totalActiveFiltersCount = Object.values(filters).reduce(
    (sum, arr) => sum + (arr?.length || 0),
    0
  );

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content multi-filter-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="multi-filter-header">
          <div className="multi-filter-header-title">
            <SlidersHorizontal size={18} className="multi-filter-title-icon" />
            <h3>Filter Pull Requests</h3>
            {totalActiveFiltersCount > 0 && (
              <span className="filter-count-badge">{totalActiveFiltersCount} active</span>
            )}
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close filters modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Master-Detail 2-Column Body */}
        <div className="multi-filter-body">
          {/* Left Column: Categories / Dimensions */}
          <nav className="multi-filter-nav" aria-label="Filter categories">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`multi-filter-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <div className="multi-filter-nav-label">
                    <Icon size={15} />
                    <span>{cat.label}</span>
                  </div>
                  <div className="multi-filter-nav-badges">
                    {cat.count > 0 && (
                      <span className="multi-filter-selected-badge">{cat.count}</span>
                    )}
                    <span className="multi-filter-avail-count">{cat.totalAvailable}</span>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Right Column: Options & Checkboxes */}
          <div className="multi-filter-detail">
            {/* Search & Batch Actions Header */}
            <div className="multi-filter-detail-toolbar">
              <div className="multi-filter-search-box">
                <Search size={14} className="multi-filter-search-icon" />
                <input
                  type="text"
                  className="multi-filter-search-input"
                  placeholder={`Search ${categories.find((c) => c.id === activeCategory)?.label?.toLowerCase()}...`}
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  autoFocus
                />
                {categorySearch && (
                  <button
                    type="button"
                    className="multi-filter-clear-search"
                    onClick={() => setCategorySearch('')}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="multi-filter-batch-actions">
                <button
                  type="button"
                  className="multi-filter-batch-btn"
                  onClick={handleSelectAllCurrent}
                  disabled={filteredOptions.length === 0}
                >
                  Select all
                </button>
                {selectedInCurrentCategory.length > 0 && (
                  <button
                    type="button"
                    className="multi-filter-batch-btn"
                    onClick={handleClearCurrentCategory}
                  >
                    Clear ({selectedInCurrentCategory.length})
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Checkbox List */}
            <div className="multi-filter-options-list">
              {filteredOptions.length === 0 ? (
                <div className="multi-filter-empty-options">
                  <p>No matching {categories.find((c) => c.id === activeCategory)?.label.toLowerCase()} found</p>
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isChecked = selectedInCurrentCategory.includes(opt.id);

                  return (
                    <label
                      key={opt.id}
                      className={`multi-filter-option-row ${isChecked ? 'selected' : ''}`}
                    >
                      <div className="multi-filter-checkbox-wrap">
                        <input
                          type="checkbox"
                          className="gh-native-checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleOption(opt.id)}
                        />
                      </div>

                      <div className="multi-filter-option-content">
                        {/* Avatar / Color Swatch / Badge */}
                        {opt.avatarUrl && (
                          <img
                            src={opt.avatarUrl}
                            alt={opt.label}
                            className="multi-filter-option-avatar"
                          />
                        )}

                        {opt.color && (
                          <span
                            className="multi-filter-label-swatch"
                            style={{ backgroundColor: opt.color.startsWith('#') ? opt.color : `#${opt.color}` }}
                          />
                        )}

                        <span className="multi-filter-option-title" title={opt.fullName || opt.label}>
                          {opt.label}
                        </span>
                      </div>

                      <span className="multi-filter-option-count">
                        {opt.count} {opt.count === 1 ? 'PR' : 'PRs'}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="multi-filter-footer">
          <div className="multi-filter-footer-left">
            {totalActiveFiltersCount > 0 ? (
              <button
                type="button"
                className="multi-filter-reset-btn"
                onClick={onResetFilters}
              >
                <RotateCcw size={13} />
                <span>Reset all filters ({totalActiveFiltersCount})</span>
              </button>
            ) : (
              <span className="multi-filter-status-text">No filters applied</span>
            )}
          </div>

          <div className="multi-filter-footer-right">
            <button
              type="button"
              className="btn-primary multi-filter-apply-btn"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
