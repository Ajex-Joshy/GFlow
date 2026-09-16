import React, { useState, useEffect, useRef } from "react";
import {
  Tag,
  StickyNote,
  X,
  Check,
  Plus,
  Trash2,
  Bookmark,
} from "lucide-react";
import {
  getCustomLabels,
  createCustomLabel,
  deleteCustomLabel,
  getPRCustomData,
  togglePRCustomLabel,
  setPRCustomNote,
} from "../utils/customLabelsStore";

const PRESET_COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
];

export default function PRLabelNotePopover({ pr, isOpen, onClose }) {
  const popoverRef = useRef(null);
  const [activeTab, setActiveTab] = useState("labels"); // "labels" | "note"
  const [customLabels, setCustomLabels] = useState([]);
  const [prData, setPRData] = useState({ labelIds: [], labels: [], note: "" });

  // New label creation state
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]);

  // Note state
  const [noteText, setNoteText] = useState("");
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  const refreshData = () => {
    if (!pr) return;
    setCustomLabels(getCustomLabels());
    const data = getPRCustomData(pr);
    setPRData(data);
    setNoteText(data.note || "");
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
      setIsCreatingLabel(false);
      setNewLabelName("");
    }
  }, [isOpen, pr]);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !pr) return null;

  const handleToggleLabel = (e, labelId) => {
    e.stopPropagation();
    togglePRCustomLabel(pr, labelId);
    refreshData();
  };

  const handleCreateLabel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newLabelName.trim()) return;

    const created = createCustomLabel(newLabelName, newLabelColor);
    if (created) {
      togglePRCustomLabel(pr, created.id);
      setNewLabelName("");
      setIsCreatingLabel(false);
      refreshData();
    }
  };

  const handleDeleteLabel = (e, labelId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this custom label from GFlow?")) {
      deleteCustomLabel(labelId);
      refreshData();
    }
  };

  const handleSaveNote = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setPRCustomNote(pr, noteText);
    setNoteSavedFeedback(true);
    refreshData();
    setTimeout(() => setNoteSavedFeedback(false), 2000);
  };

  const handleClearNote = (e) => {
    e.stopPropagation();
    setNoteText("");
    setPRCustomNote(pr, "");
    refreshData();
  };

  return (
    <div
      className="gflow-popover-backdrop"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="gflow-popover-card"
        ref={popoverRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gflow-popover-title"
      >
        {/* Header */}
        <div className="gflow-popover-header">
          <div className="gflow-popover-title-row">
            <Bookmark size={15} className="gflow-popover-header-icon" />
            <span id="gflow-popover-title" className="gflow-popover-title">
              GFlow Annotations
            </span>
            <span className="gflow-internal-pill">Internal Only</span>
          </div>
          <button
            type="button"
            className="gflow-popover-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="gflow-popover-pr-ref">
          <span className="gflow-pr-num">#{pr.number}</span>
          <span className="gflow-pr-title-truncate">{pr.title}</span>
        </div>

        {/* Tab Switcher */}
        <div className="gflow-popover-tabs">
          <button
            type="button"
            className={`gflow-popover-tab ${activeTab === "labels" ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("labels");
            }}
          >
            <Tag size={13} />
            <span>Labels ({prData.labelIds?.length || 0})</span>
          </button>
          <button
            type="button"
            className={`gflow-popover-tab ${activeTab === "note" ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("note");
            }}
          >
            <StickyNote size={13} />
            <span>Note {prData.note ? "•" : ""}</span>
          </button>
        </div>

        {/* Tab 1: Labels */}
        {activeTab === "labels" && (
          <div className="gflow-popover-body">
            <div className="gflow-labels-list">
              {customLabels.map((lbl) => {
                const isSelected = prData.labelIds.includes(lbl.id);
                return (
                  <div
                    key={lbl.id}
                    className={`gflow-label-item ${isSelected ? "selected" : ""}`}
                    onClick={(e) => handleToggleLabel(e, lbl.id)}
                  >
                    <span
                      className="gflow-label-checkbox"
                      style={{
                        borderColor: isSelected ? lbl.color : "var(--color-border-default)",
                        backgroundColor: isSelected ? lbl.color : "transparent",
                      }}
                    >
                      {isSelected && <Check size={11} strokeWidth={3} color="#ffffff" />}
                    </span>

                    <span
                      className="gflow-custom-label-chip"
                      style={{
                        backgroundColor: `${lbl.color}20`,
                        color: lbl.color,
                        borderColor: `${lbl.color}50`,
                      }}
                    >
                      <span className="gflow-chip-dot" style={{ backgroundColor: lbl.color }} />
                      {lbl.name}
                    </span>

                    <button
                      type="button"
                      className="gflow-label-del-btn"
                      onClick={(e) => handleDeleteLabel(e, lbl.id)}
                      title="Delete label definition"
                      aria-label={`Delete label ${lbl.name}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Create Label Section */}
            {!isCreatingLabel ? (
              <button
                type="button"
                className="gflow-add-label-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreatingLabel(true);
                }}
              >
                <Plus size={13} />
                <span>Create new GFlow label</span>
              </button>
            ) : (
              <form onSubmit={handleCreateLabel} className="gflow-create-label-form">
                <div className="gflow-create-input-row">
                  <input
                    type="text"
                    className="gflow-create-input"
                    placeholder="Label name (e.g. Needs DB Review)"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    autoFocus
                  />
                  <div className="gflow-swatches-row">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`gflow-swatch-dot ${newLabelColor === c ? "active" : ""}`}
                        style={{ backgroundColor: c }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewLabelColor(c);
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="gflow-create-actions">
                  <button
                    type="button"
                    className="gflow-btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCreatingLabel(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="gflow-btn-primary"
                    disabled={!newLabelName.trim()}
                  >
                    Add Label
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: PR Note */}
        {activeTab === "note" && (
          <div className="gflow-popover-body">
            <p className="gflow-note-hint">
              Attach a private scratchpad note or reminder for this PR:
            </p>
            <textarea
              className="gflow-note-textarea"
              rows={4}
              placeholder="e.g. Waiting for Alex to finish API review before merging; remember to verify migration on staging."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />

            <div className="gflow-note-actions">
              {prData.note && (
                <button
                  type="button"
                  className="gflow-btn-danger"
                  onClick={handleClearNote}
                >
                  Clear Note
                </button>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {noteSavedFeedback && (
                  <span className="gflow-note-saved-text">
                    <Check size={12} strokeWidth={3} /> Saved
                  </span>
                )}
                <button
                  type="button"
                  className="gflow-btn-primary"
                  onClick={handleSaveNote}
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="gflow-popover-footer">
          <span>Persisted in local storage • Never sent to GitHub</span>
        </div>
      </div>
    </div>
  );
}
