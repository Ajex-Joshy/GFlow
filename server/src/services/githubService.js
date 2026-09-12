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
 * Get authenticated user profile
 */
export const getUserProfile = async (token) => {
  const client = createClient(token);
  const data = await client(`
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
  return data.viewer;
};

/**
 * Transform a GraphQL PR node into a clean, unified structure
 */
const formatPRNode = (pr, extra = {}) => {
  // Calculate unresolved review threads if reviewThreads field exists
  let unresolvedCommentsCount = 0;
  let totalCommentsThreads = 0;

  if (pr.reviewThreads?.nodes) {
    totalCommentsThreads = pr.reviewThreads.nodes.length;
    unresolvedCommentsCount = pr.reviewThreads.nodes.filter(
      (thread) => !thread.isResolved
    ).length;
  }

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
      owner: pr.repository?.owner?.login || '',
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
    ...extra,
  };
};

/**
 * 1. PRs where user is a Reviewer (review-requested or assigned reviewer)
 */
export const getReviewerPRs = async (token, username) => {
  const client = createClient(token);
  const query = `is:open is:pr review-requested:${username} archived:false`;

  const data = await client(`
    query ($query: String!) {
      search(query: $query, type: ISSUE, first: 50) {
        issueCount
        nodes {
          ... on PullRequest {
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
              owner { login }
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
            reviewRequests(first: 10) {
              nodes {
                requestedReviewer {
                  ... on User { login avatarUrl }
                  ... on Team { name }
                }
              }
            }
          }
        }
      }
    }
  `, { query });

  return (data.search?.nodes || []).map((node) => formatPRNode(node));
};

/**
 * 2. PRs raised by the user (with unresolved comments thread calculations)
 */
export const getRaisedPRs = async (token, username) => {
  const client = createClient(token);
  const query = `is:open is:pr author:${username} archived:false`;

  const data = await client(`
    query ($query: String!) {
      search(query: $query, type: ISSUE, first: 50) {
        issueCount
        nodes {
          ... on PullRequest {
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
              owner { login }
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
          }
        }
      }
    }
  `, { query });

  return (data.search?.nodes || []).map((node) => formatPRNode(node));
};

/**
 * 3. PRs approved by user
 */
export const getApprovedPRs = async (token, username) => {
  const client = createClient(token);
  // Returns PRs where user approved
  const query = `is:pr reviewed-by:${username} review:approved archived:false`;

  const data = await client(`
    query ($query: String!) {
      search(query: $query, type: ISSUE, first: 50) {
        issueCount
        nodes {
          ... on PullRequest {
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
              owner { login }
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
  `, { query });

  return (data.search?.nodes || []).map((node) => {
    const lastApproval = node.reviews?.nodes?.[0]?.submittedAt || null;
    return formatPRNode(node, { approvedAt: lastApproval });
  });
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
