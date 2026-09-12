/**
 * Formats an ISO date string into the user's requested format:
 * "Created: 1d 18h 1m ago (10 Sep, 11:37 PM)"
 * 
 * @param {string} isoString - The ISO date string
 * @param {string} prefix - Optional prefix (default: "Created: ")
 * @returns {string} Formatted timestamp string
 */
export function formatPRTimestamp(isoString, prefix = 'Created: ') {
  if (!isoString) return '';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = Math.max(0, now - date);

  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);

  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  // Build relative string
  let relativeParts = [];
  if (days > 0) {
    relativeParts.push(`${days}d`);
    relativeParts.push(`${hours}h`);
    relativeParts.push(`${minutes}m ago`);
  } else if (hours > 0) {
    relativeParts.push(`${hours}h`);
    relativeParts.push(`${minutes}m ago`);
  } else if (minutes > 0) {
    relativeParts.push(`${minutes}m ago`);
  } else {
    relativeParts.push('just now');
  }
  const relativeStr = relativeParts.join(' ');

  // Format absolute date: "10 Sep, 11:37 PM"
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];

  let rawHours = date.getHours();
  const ampm = rawHours >= 12 ? 'PM' : 'AM';
  rawHours = rawHours % 12;
  const displayHours = rawHours ? rawHours : 12; // 0 becomes 12
  const displayMinutes = date.getMinutes().toString().padStart(2, '0');

  const absoluteStr = `(${day} ${month}, ${displayHours}:${displayMinutes} ${ampm})`;

  return `${prefix}${relativeStr} ${absoluteStr}`;
}

/**
 * Format relative duration for other events (e.g. updated, approved)
 */
export function formatRelativeOnly(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = Math.max(0, now - date);
  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);

  if (days > 0) return `${days}d ago`;
  if (totalHours > 0) return `${totalHours}h ago`;
  if (totalMinutes > 0) return `${totalMinutes}m ago`;
  return 'just now';
}

/**
 * Format elapsed duration since review was requested into "HH : MM" format
 * e.g. "04 : 32" (4 hours, 32 minutes), "26 : 15" (26 hours, 15 minutes)
 * 
 * @param {string} isoString - The ISO date when review was requested
 * @returns {string} Formatted "HH : MM" elapsed time
 */
export function formatReviewWaitTimer(isoString) {
  if (!isoString) return '00 : 00';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '00 : 00';

  const now = new Date();
  const diffMs = Math.max(0, now - date);

  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const hh = String(totalHours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');

  return `${hh} : ${mm}`;
}
