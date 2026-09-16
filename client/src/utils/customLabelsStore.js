/**
 * GFlow Internal PR Labels & Notes Storage Utility
 *
 * Stores user-defined custom labels and per-PR metadata (attached labels, notes)
 * in localStorage. Completely independent of GitHub.
 */

const STORAGE_KEY = "gflow_custom_pr_data_v1";
const LISTENERS = new Set();

export const DEFAULT_PRESET_LABELS = [
  { id: "gflow-urgent", name: "Urgent", color: "#ef4444" },
  { id: "gflow-qa-ready", name: "QA Ready", color: "#10b981" },
  { id: "gflow-blocked", name: "Blocked", color: "#f59e0b" },
  { id: "gflow-follow-up", name: "Follow-up", color: "#8b5cf6" },
  { id: "gflow-investigate", name: "Investigate", color: "#06b6d4" },
  { id: "gflow-client-demo", name: "Client Demo", color: "#ec4899" },
];

/**
 * Returns a stable unique key for a PR across repos and numbers
 */
export function getPRIdentifier(pr) {
  if (!pr) return "";
  const repo = pr.repository?.nameWithOwner || pr.repository?.name || "unknown";
  const number = pr.number || pr.id || "0";
  return `${repo}#${number}`.toLowerCase();
}

/**
 * Load raw data from localStorage
 */
function loadRawData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        labels: DEFAULT_PRESET_LABELS,
        prMap: {},
      };
    }
    const data = JSON.parse(raw);
    if (!Array.isArray(data.labels) || data.labels.length === 0) {
      data.labels = DEFAULT_PRESET_LABELS;
    }
    if (!data.prMap || typeof data.prMap !== "object") {
      data.prMap = {};
    }
    return data;
  } catch (err) {
    console.error("[GFlow Storage] Error reading custom PR data:", err);
    return {
      labels: DEFAULT_PRESET_LABELS,
      prMap: {},
    };
  }
}

/**
 * Save data to localStorage and notify all subscribers
 */
function saveRawData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    notifyListeners();
  } catch (err) {
    console.error("[GFlow Storage] Error saving custom PR data:", err);
  }
}

/**
 * Subscribe to store changes
 */
export function subscribeCustomData(listener) {
  LISTENERS.add(listener);
  return () => LISTENERS.delete(listener);
}

function notifyListeners() {
  LISTENERS.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error(e);
    }
  });
}

/**
 * Get all available GFlow custom labels
 */
export function getCustomLabels() {
  const data = loadRawData();
  return data.labels || [];
}

/**
 * Add a new custom label definition
 */
export function createCustomLabel(name, color = "#6366f1") {
  if (!name || !name.trim()) return null;
  const cleanName = name.trim();
  const data = loadRawData();

  // Check if exists
  const existing = data.labels.find(
    (l) => l.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (existing) return existing;

  const newLabel = {
    id: `gflow-lbl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    color,
  };

  data.labels.push(newLabel);
  saveRawData(data);
  return newLabel;
}

/**
 * Delete a custom label definition and remove from all PRs
 */
export function deleteCustomLabel(labelId) {
  const data = loadRawData();
  data.labels = data.labels.filter((l) => l.id !== labelId);

  // Clean up references in prMap
  Object.keys(data.prMap).forEach((prKey) => {
    if (Array.isArray(data.prMap[prKey]?.labelIds)) {
      data.prMap[prKey].labelIds = data.prMap[prKey].labelIds.filter((id) => id !== labelId);
    }
  });

  saveRawData(data);
}

/**
 * Get PR metadata: { labelIds: string[], labels: Array<{id, name, color}>, note: string }
 */
export function getPRCustomData(pr) {
  const prKey = typeof pr === "string" ? pr.toLowerCase() : getPRIdentifier(pr);
  if (!prKey) return { labelIds: [], labels: [], note: "" };

  const data = loadRawData();
  const prEntry = data.prMap[prKey] || { labelIds: [], note: "" };
  const labelIds = prEntry.labelIds || [];

  const labelMap = new Map(data.labels.map((l) => [l.id, l]));
  const labels = labelIds.map((id) => labelMap.get(id)).filter(Boolean);

  return {
    labelIds,
    labels,
    note: prEntry.note || "",
  };
}

/**
 * Toggle a label on a PR
 */
export function togglePRCustomLabel(pr, labelId) {
  const prKey = typeof pr === "string" ? pr.toLowerCase() : getPRIdentifier(pr);
  if (!prKey || !labelId) return;

  const data = loadRawData();
  if (!data.prMap[prKey]) {
    data.prMap[prKey] = { labelIds: [], note: "" };
  }

  const currentIds = data.prMap[prKey].labelIds || [];
  const exists = currentIds.includes(labelId);

  if (exists) {
    data.prMap[prKey].labelIds = currentIds.filter((id) => id !== labelId);
  } else {
    data.prMap[prKey].labelIds = [...currentIds, labelId];
  }

  saveRawData(data);
}

/**
 * Set or clear note for a PR
 */
export function setPRCustomNote(pr, note) {
  const prKey = typeof pr === "string" ? pr.toLowerCase() : getPRIdentifier(pr);
  if (!prKey) return;

  const data = loadRawData();
  if (!data.prMap[prKey]) {
    data.prMap[prKey] = { labelIds: [], note: "" };
  }

  data.prMap[prKey].note = (note || "").trim();
  saveRawData(data);
}

/**
 * Get all PR entries for multi-filter or search mapping
 */
export function getAllPRCustomDataMap() {
  const data = loadRawData();
  return {
    labels: data.labels,
    prMap: data.prMap,
  };
}
