/**
 * Review SLA & Turnaround Duration Utilities
 * Calculates elapsed review wait times, handles flexible day exclusions, and determines urgency levels.
 */

/**
 * Calculates elapsed hours from a start date, optionally pausing during specified excluded days.
 * @param {string|Date} startDate - When the wait began
 * @param {number[]} excludedDays - Array of day numbers (0 = Sun, 1 = Mon, ..., 6 = Sat) to pause on
 * @param {Date} [referenceDate] - Current timestamp
 */
export function calculateElapsedHours(startDate, excludedDays = [0, 6], referenceDate = new Date()) {
  const start = new Date(startDate);
  const end = new Date(referenceDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return 0;
  }

  const daysToExclude = Array.isArray(excludedDays) ? excludedDays : [];
  if (daysToExclude.length === 0) {
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  // Step through time in 1-hour increments to accurately subtract excluded days
  let totalMs = 0;
  let current = new Date(start.getTime());
  const ONE_HOUR = 60 * 60 * 1000;

  while (current < end) {
    const next = new Date(Math.min(current.getTime() + ONE_HOUR, end.getTime()));
    const day = current.getDay(); // 0 is Sunday, 6 is Saturday

    if (!daysToExclude.includes(day)) {
      totalMs += next.getTime() - current.getTime();
    }
    current = next;
  }

  return totalMs / (1000 * 60 * 60);
}

/**
 * Formats elapsed hours into compact, readable strings (e.g. "45m", "4h 30m", "2d 5h")
 */
export function formatSlaDuration(hours) {
  if (hours < 1) {
    const mins = Math.max(1, Math.round(hours * 60));
    return `${mins}m`;
  }
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

/**
 * Determines Review Request SLA status for PRs waiting on user review.
 */
export function getReviewSlaStatus(pr, settings = {}) {
  if (settings.enableSlaTracking === false) return null;
  const dateStr = pr.reviewRequestedAt || pr.createdAt;
  if (!dateStr) return null;

  const excludedDays = settings.slaExcludedDays ?? (settings.pauseSlaOnWeekends === false ? [] : [0, 6]);
  const warningHours = Number(settings.reviewWarningHours) || 12;
  const overdueHours = Number(settings.reviewOverdueHours) || 24;

  const elapsedHours = calculateElapsedHours(dateStr, excludedDays);
  const formattedDuration = formatSlaDuration(elapsedHours);

  let status = 'healthy';
  let label = formattedDuration;
  let tooltip = `Review requested ${formattedDuration} ago`;

  if (elapsedHours >= overdueHours) {
    status = 'overdue';
    label = `${formattedDuration} • Overdue`;
    tooltip = `SLA Breached! Waiting on review for ${formattedDuration} (deadline was ${overdueHours}h). Teammate is blocked.`;
  } else if (elapsedHours >= warningHours) {
    status = 'due-soon';
    label = `${formattedDuration} • Due Soon`;
    tooltip = `Approaching SLA deadline (${formattedDuration} elapsed, deadline is ${overdueHours}h). Recommended to review soon.`;
  }

  return {
    status, // 'healthy' | 'due-soon' | 'overdue'
    label,
    tooltip,
    formattedDuration,
    elapsedHours,
  };
}

/**
 * Determines Author Follow-up status for PRs created by the user that are awaiting reviewer action.
 */
export function getCreatedSlaStatus(pr, settings = {}) {
  if (settings.enableSlaTracking === false) return null;
  if (!pr || pr.state === 'MERGED' || pr.isDraft) return null;

  // If already approved, author is not blocked waiting for initial review
  const hasApproved = pr.reviewers?.some((r) => r.state === 'APPROVED');
  if (hasApproved) return null;

  const excludedDays = settings.slaExcludedDays ?? (settings.pauseSlaOnWeekends === false ? [] : [0, 6]);
  const nudgeHours = Number(settings.createdNudgeHours) || 24;
  const stalledHours = Number(settings.createdStalledHours) || 48;

  // Measure wait time from the oldest pending reviewer request, or fallback to PR creation
  const pendingReviewers = pr.reviewers?.filter((r) => r.state === 'PENDING' || r.state !== 'APPROVED') || [];
  let referenceDate = pr.createdAt;

  if (pendingReviewers.length > 0) {
    const validDates = pendingReviewers
      .map((r) => r.requestedAt)
      .filter(Boolean)
      .map((d) => new Date(d).getTime())
      .filter((t) => !isNaN(t));

    if (validDates.length > 0) {
      referenceDate = new Date(Math.min(...validDates));
    }
  }

  if (!referenceDate) return null;

  const elapsedHours = calculateElapsedHours(referenceDate, excludedDays);
  const formattedDuration = formatSlaDuration(elapsedHours);

  if (elapsedHours >= stalledHours) {
    return {
      status: 'stalled',
      label: 'Stalled',
      formattedDuration,
      tooltip: `No review activity for ${formattedDuration}. High risk of merge conflicts — consider pinging reviewers or reassigning.`,
      elapsedHours,
    };
  } else if (elapsedHours >= nudgeHours) {
    return {
      status: 'follow-up',
      label: 'Follow-up due',
      formattedDuration,
      tooltip: `Waiting on review for ${formattedDuration} (exceeded ${nudgeHours}h). Recommended to follow up with reviewers.`,
      elapsedHours,
    };
  }

  return null;
}
