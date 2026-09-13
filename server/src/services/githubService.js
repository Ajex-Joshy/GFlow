import { graphql } from '@octokit/graphql';
import axios from 'axios';

/**
 * Creates an authenticated Octokit GraphQL client
 */
const createClient = (token) => {
  return graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });
};

/**
 * Get authenticated user profile along with member organizations
 */
export const getUserProfile = async (token) => {
  const client = createClient(token);
  
  // 1. Fetch user viewer info
  const viewerData = await client(`
    query {
      viewer {
        login
        name
        avatarUrl
        url
        bio
      }
    }
  `);

  const viewer = viewerData.viewer;

  // 2. Fetch organizations (requires read:org scope)
  try {
    const orgsData = await client(`
      query {
        viewer {
          organizations(first: 50) {
            nodes {
              id
              login
              name
              avatarUrl
              url
            }
          }
        }
      }
    `);
    viewer.organizations = orgsData.viewer?.organizations || { nodes: [] };
  } catch (err) {
    console.warn('Organizations query warning (read:org scope may be needed):', err.message);
    viewer.organizations = { nodes: [] };
  }

  return viewer;
};

/**
 * Transform a GraphQL PR node into a clean, unified structure
 */
const formatPRNode = (pr, extra = {}) => {
  let unresolvedCommentsCount = 0;
  let totalCommentsThreads = 0;

  if (pr.reviewThreads?.nodes) {
    totalCommentsThreads = pr.reviewThreads.nodes.length;
    unresolvedCommentsCount = pr.reviewThreads.nodes.filter(
      (thread) => !thread.isResolved
    ).length;
  }

  const ownerLogin = pr.repository?.owner?.login || '';

  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    url: pr.url,
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    closedAt: pr.closedAt,
    mergedAt: pr.mergedAt,
    state: pr.state,
    isDraft: pr.isDraft || false,
    repository: {
      name: pr.repository?.name || '',
      nameWithOwner: pr.repository?.nameWithOwner || '',
      url: pr.repository?.url || '',
      isPrivate: pr.repository?.isPrivate || false,
      owner: ownerLogin,
      ownerAvatarUrl: pr.repository?.owner?.avatarUrl || null,
    },
    author: {
      login: pr.author?.login || 'ghost',
      avatarUrl: pr.author?.avatarUrl || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
      url: pr.author?.url || '#',
    },
    additions: pr.additions || 0,
    deletions: pr.deletions || 0,
    changedFiles: pr.changedFiles || 0,
    totalCommentsCount: pr.comments?.totalCount || 0,
    unresolvedCommentsCount,
    totalCommentsThreads,
    reviewDecision: pr.reviewDecision || null,
    labels: (pr.labels?.nodes || []).map((l) => ({
      name: l.name,
      color: l.color,
    })),
    assignees: (pr.assignees?.nodes || []).map((a) => ({
      login: a.login,
      avatarUrl: a.avatarUrl,
    })),
    reviewRequests: (pr.reviewRequests?.nodes || []).map((r) => ({
      login: r.requestedReviewer?.login || r.requestedReviewer?.name || 'Reviewer',
      avatarUrl: r.requestedReviewer?.avatarUrl || null,
    })),
    checkState: pr.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state || null,
    reviewRequestedAt: (() => {
      const timelineEvents = pr.timelineItems?.nodes || [];
      if (extra.currentUserLogin) {
        const match = [...timelineEvents].reverse().find((evt) => {
          const login = evt.requestedReviewer?.login;
          return login?.toLowerCase() === extra.currentUserLogin?.toLowerCase();
        });
        if (match?.createdAt) return match.createdAt;
      }
      if (timelineEvents.length > 0) {
        return timelineEvents[timelineEvents.length - 1]?.createdAt || pr.createdAt;
      }
      return pr.createdAt;
    })(),
    reviewers: (() => {
      const timelineEvents = pr.timelineItems?.nodes || [];
      const latestReviewsMap = new Map();
      (pr.latestReviews?.nodes || []).forEach((rev) => {
        const revLogin = rev.author?.login;
        if (revLogin) {
          latestReviewsMap.set(revLogin.toLowerCase(), {
            login: revLogin,
            avatarUrl: rev.author?.avatarUrl,
            state: rev.state, // 'APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED'
            submittedAt: rev.submittedAt,
          });
        }
      });

      const list = [];
      const seen = new Set();

      // 1. Pending review requests (if re-requested, state is PENDING)
      (pr.reviewRequests?.nodes || []).forEach((req) => {
        const reqLogin = req.requestedReviewer?.login || req.requestedReviewer?.name;
        if (!reqLogin) return;
        const key = reqLogin.toLowerCase();
        seen.add(key);

        const matchingTimeline = [...timelineEvents].reverse().find((evt) => {
          const l = evt.requestedReviewer?.login || evt.requestedReviewer?.name;
          return l?.toLowerCase() === key;
        });

        list.push({
          login: reqLogin,
          avatarUrl: req.requestedReviewer?.avatarUrl || null,
          state: 'PENDING',
          isTeam: !req.requestedReviewer?.login,
          requestedAt: matchingTimeline?.createdAt || pr.createdAt,
        });
      });

      // 2. Completed reviews not currently pending
      latestReviewsMap.forEach((rev, key) => {
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            login: rev.login,
            avatarUrl: rev.avatarUrl,
            state: rev.state,
            submittedAt: rev.submittedAt,
          });
        }
      });

      return list;
    })(),
    ...extra,
  };
};

/**
 * Common GraphQL fragment for PR fields
 */
const PR_FIELDS = `
  id
  number
  title
  url
  createdAt
  updatedAt
  state
  isDraft
  reviewDecision
  additions
  deletions
  changedFiles
  repository {
    name
    nameWithOwner
    url
    isPrivate
    owner {
      login
      avatarUrl
    }
  }
  author {
    login
    avatarUrl
    url
  }
  labels(first: 5) {
    nodes { name color }
  }
  comments {
    totalCount
  }
  reviewThreads(first: 100) {
    totalCount
    nodes {
      id
      isResolved
      isOutdated
      comments(first: 1) {
        totalCount
      }
    }
  }
  reviewRequests(first: 10) {
    nodes {
      requestedReviewer {
        ... on User { login avatarUrl }
        ... on Team { name }
      }
    }
  }
  commits(last: 1) {
    nodes {
      commit {
        statusCheckRollup {
          state
        }
      }
    }
  }
  timelineItems(last: 10, itemTypes: [REVIEW_REQUESTED_EVENT]) {
    nodes {
      ... on ReviewRequestedEvent {
        createdAt
        requestedReviewer {
          ... on User { login }
          ... on Team { name }
        }
      }
    }
  }
  latestReviews(first: 15) {
    nodes {
      author {
        login
        avatarUrl
      }
      state
      submittedAt
    }
  }
`;

/**
 * 1. PRs where user is a Reviewer (individual or team review requested in any org or personal repo)
 */
export const getReviewerPRs = async (token, username) => {
  const client = createClient(token);
  // review-requested:@me matches direct user review requests AND team review requests in organizations
  const queryString = `is:open is:pr review-requested:@me archived:false`;

  const data = await client(`
    query ($queryString: String!) {
      search(query: $queryString, type: ISSUE, first: 50) {
        issueCount
        nodes {
          ... on PullRequest {
            ${PR_FIELDS}
          }
        }
      }
    }
  `, { queryString });

  return (data.search?.nodes || []).map((node) =>
    formatPRNode(node, { currentUserLogin: username })
  );
};

/**
 * 2. PRs raised by the user (across personal & organization repositories)
 */
export const getRaisedPRs = async (token, username) => {
  const client = createClient(token);
  const queryString = `is:open is:pr author:@me archived:false`;

  const data = await client(`
    query ($queryString: String!) {
      search(query: $queryString, type: ISSUE, first: 50) {
        issueCount
        nodes {
          ... on PullRequest {
            ${PR_FIELDS}
          }
        }
      }
    }
  `, { queryString });

  return (data.search?.nodes || []).map((node) => formatPRNode(node));
};

/**
 * 2b. PRs raised by the user that were merged (recent 30)
 */
export const getRaisedMergedPRs = async (token, username) => {
  const client = createClient(token);
  const queryString = `is:merged is:pr author:@me archived:false`;

  const data = await client(`
    query ($queryString: String!) {
      search(query: $queryString, type: ISSUE, first: 30) {
        issueCount
        nodes {
          ... on PullRequest {
            ${PR_FIELDS}
          }
        }
      }
    }
  `, { queryString });

  return (data.search?.nodes || []).map((node) => formatPRNode(node));
};

/**
 * 3. PRs approved by user (across personal & organization repositories)
 */
export const getApprovedPRs = async (token, username) => {
  const client = createClient(token);
  const queryString = `is:pr reviewed-by:@me review:approved archived:false`;

  const data = await client(`
    query ($queryString: String!) {
      search(query: $queryString, type: ISSUE, first: 50) {
        issueCount
        nodes {
          ... on PullRequest {
            ${PR_FIELDS}
            reviews(author: "${username}", states: [APPROVED], last: 1) {
              nodes {
                submittedAt
                state
              }
            }
          }
        }
      }
    }
  `, { queryString });

  return (data.search?.nodes || []).map((node) => {
    const lastApproval = node.reviews?.nodes?.[0]?.submittedAt || null;
    return formatPRNode(node, { approvedAt: lastApproval });
  });
};

/**
 * 4. Team PRs: All active open PRs across user's organizations and personal repositories
 * Ideal for Engineering Managers, Tech Leads, and Team Overviews.
 */
export const getTeamPRs = async (token, username, orgs = []) => {
  const client = createClient(token);
  
  // Build search qualifiers: e.g. "org:org1 org:org2 user:username"
  const orgLogins = (orgs || []).map((o) => o.login || o).filter(Boolean);
  const scopeParts = orgLogins.map((login) => `org:${login}`);
  if (username) {
    scopeParts.push(`user:${username}`);
  }
  
  const scopeFilter = scopeParts.length > 0 ? scopeParts.join(' ') : `user:${username}`;
  const queryString = `is:open is:pr ${scopeFilter} archived:false`;

  const data = await client(`
    query ($queryString: String!) {
      search(query: $queryString, type: ISSUE, first: 100) {
        issueCount
        nodes {
          ... on PullRequest {
            ${PR_FIELDS}
          }
        }
      }
    }
  `, { queryString });

  return (data.search?.nodes || []).map((node) =>
    formatPRNode(node, { currentUserLogin: username })
  );
};

/**
 * Exchange OAuth authorization code for GitHub access token
 */
export const exchangeOAuthCode = async (code, clientId, clientSecret) => {
  const response = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: clientId,
      client_secret: clientSecret,
      code,
    },
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );

  return response.data;
};
