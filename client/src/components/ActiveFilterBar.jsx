import React from 'react';
import { X, RotateCcw } from 'lucide-react';

export default function ActiveFilterBar({
  filters,
  onRemoveFilter,
  onResetFilters,
}) {
  const categoryLabels = {
    repositories: 'Repo',
    authors: 'Author',
    assignees: 'Assignee',
    reviewers: 'Reviewer',
    labels: 'Label',
    slaUrgency: 'SLA',
  };

  const slaDisplayNames = {
    overdue: 'Overdue (>24h)',
    stalled: 'Stalled (>48h)',
    'due-soon': 'Due Soon',
    healthy: 'Healthy',
  };

  const activePills = [];

  Object.entries(filters).forEach(([catKey, items]) => {
    if (!Array.isArray(items)) return;
    const prefix = categoryLabels[catKey] || catKey;

    items.forEach((item) => {
      let displayValue = item;
      if (catKey === 'repositories' && item.includes('/')) {
        displayValue = item.split('/')[1];
      } else if (catKey === 'slaUrgency') {
        displayValue = slaDisplayNames[item] || item;
      }

      activePills.push({
        category: catKey,
        id: item,
        prefix,
        label: displayValue,
      });
    });
  });

  if (activePills.length === 0) return null;

  return (
    <div className="active-filter-bar" aria-label="Active Filters">
      <div className="active-filter-pills-list">
        <span className="active-filter-label">Active Filters:</span>

        {activePills.map((pill) => (
          <span
            key={`${pill.category}-${pill.id}`}
            className="active-filter-pill"
          >
            <span className="active-filter-pill-prefix">{pill.prefix}:</span>
            <span className="active-filter-pill-val">{pill.label}</span>
            <button
              type="button"
              className="active-filter-pill-remove"
              onClick={() => onRemoveFilter(pill.category, pill.id)}
              aria-label={`Remove filter ${pill.prefix}: ${pill.label}`}
              title={`Remove filter ${pill.prefix}: ${pill.label}`}
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          </span>
        ))}

        <button
          type="button"
          className="active-filter-clear-all-link"
          onClick={onResetFilters}
          title="Clear all active filters"
        >
          <RotateCcw size={11} />
          <span>Clear all</span>
        </button>
      </div>
    </div>
  );
}
