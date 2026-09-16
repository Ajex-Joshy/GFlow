/**
 * PR Tracker API Service
 * Handles communication with backend server endpoints
 */

const API_BASE = '/api';

/**
 * Helper for fetch requests with JSON parsing and credentials
 */
async function request(endpoint, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store',
      'Pragma': 'no-cache',
      ...options.headers,
    },
    credentials: 'include', // Send and receive session cookies
    ...options,
  };

  const sep = endpoint.includes('?') ? '&' : '?';
  const url = `${API_BASE}${endpoint}${sep}_t=${Date.now()}`;
  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || data.error || `HTTP error ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth endpoints
  getAuthConfig: () => request('/auth/config'),
  getCurrentUser: () => request('/auth/me'),
  loginWithPAT: (token) =>
    request('/auth/token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),

  // PR Endpoints
  getPRSummary: (force = false) => request(`/prs/summary${force ? '?force=true' : ''}`),
  getReviewerPRs: () => request('/prs/reviewer'),
  getRaisedPRs: () => request('/prs/raised'),
  getApprovedPRs: () => request('/prs/approved'),
};
