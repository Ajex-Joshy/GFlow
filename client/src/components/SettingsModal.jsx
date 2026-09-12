import React, { useState } from 'react';
import { X, Building2, Bot, Ban, Plus, Trash2, Check, Tag, CheckCircle2, Clock } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  user,
  organizations = [],
  availableRepos = [],
}) {
  if (!isOpen) return null;

  const [currentSettings, setCurrentSettings] = useState(settings);
  const [newRepoInput, setNewRepoInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  const handleToggleBots = () => {
    const updated = {
      ...currentSettings,
      ignoreBots: !currentSettings.ignoreBots,
    };
    setCurrentSettings(updated);
    onSaveSettings(updated);
    triggerSavedToast();
  };

  const handleToggleApprovedTab = () => {
    const updated = {
      ...currentSettings,
      showApprovedTab: currentSettings.showApprovedTab === false ? true : false,
    };
    setCurrentSettings(updated);
    onSaveSettings(updated);
    triggerSavedToast();
  };

  const handleToggleLabels = () => {
    const updated = {
      ...currentSettings,
      showLabels: currentSettings.showLabels === false ? true : false,
    };
    setCurrentSettings(updated);
    onSaveSettings(updated);
    triggerSavedToast();
  };

  const handleToggleDetailedTimestamp = () => {
    const updated = {
      ...currentSettings,
      showDetailedTimestamp: currentSettings.showDetailedTimestamp === false ? true : false,
    };
    setCurrentSettings(updated);
    onSaveSettings(updated);
    triggerSavedToast();
  };

  const handleToggleCIStatus = () => {
    const updated = {
      ...currentSettings,
      showCIStatus: currentSettings.showCIStatus === false ? true : false,
    };
    setCurrentSettings(updated);
    onSaveSettings(updated);
    triggerSavedToast();
  };

  const handleToggleReviewWaitTimer = () => {
    const updated = {
      ...currentSettings,
      showReviewWaitTimer: currentSettings.showReviewWaitTimer === false ? true : false,
    };
    setCurrentSettings(updated);
    onSaveSettings(updated);
    triggerSavedToast();
  };

  const handleToggleReviewerStatus = () => {
    const updated = {
      ...currentSettings,
      showReviewerStatus: currentSettings.showReviewerStatus === false ? true : false,
    };
    setCurrentSettings(updated);
    onSaveSettings(updated);
    triggerSavedToast();
  };

  const handleChangeDefaultOrg = (orgValue) => {
    const updated = {
      ...currentSettings,
      defaultOrg: orgValue,
    };
    setCurrentSettings(updated);
    onSaveSettings(updated);
    triggerSavedToast();
  };

  const handleAddExcludedRepo = (repoToAdd) => {
    const trimmed = (repoToAdd || newRepoInput).trim().toLowerCase();
    if (!trimmed) return;

    if (!trimmed.includes('/')) {
      setInputError('Repository must be in "owner/repo" format (e.g. facebook/react)');
      return;
    }

    if (currentSettings.excludedRepos.some((r) => r.toLowerCase() === trimmed)) {
      setInputError('This repository is already in your excluded list.');
      return;
    }

    const updated = {
      ...currentSettings,
      excludedRepos: [...currentSettings.excludedRepos, trimmed],
    };

    setCurrentSettings(updated);
    onSaveSettings(updated);
    setNewRepoInput('');
    setInputError('');
    triggerSavedToast();
  };

  const handleRemoveExcludedRepo = (repoToRemove) => {
    const updated = {
      ...currentSettings,
      excludedRepos: currentSettings.excludedRepos.filter(
        (r) => r.toLowerCase() !== repoToRemove.toLowerCase()
      ),
    };
    setCurrentSettings(updated);
    onSaveSettings(updated);
    triggerSavedToast();
  };

  const triggerSavedToast = () => {
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 2000);
  };

  // Repositories available in active PRs that are not yet excluded
  const suggestedRepos = availableRepos
    .filter((repo) => !currentSettings.excludedRepos.includes(repo.toLowerCase()))
    .slice(0, 6);

  return (
    <div className="gh-modal-backdrop" onClick={onClose}>
      <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="gh-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 className="gh-modal-title">Preferences & Noise Filtering</h2>
            {showSavedFeedback && (
              <span className="saved-indicator">
                <Check size={12} /> Saved
              </span>
            )}
          </div>
          <button className="gh-modal-close-btn" onClick={onClose} title="Close settings">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="gh-modal-body">
          {/* Section 1: Default Organization on Startup */}
          <section className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon">
                <Building2 size={16} />
              </div>
              <div>
                <h3 className="settings-heading">Default Organization on Startup</h3>
                <p className="settings-desc">
                  Choose which organization view automatically opens when you load the dashboard.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <select
                className="gh-input"
                style={{ width: '100%', maxWidth: '360px', cursor: 'pointer' }}
                value={currentSettings.defaultOrg}
                onChange={(e) => handleChangeDefaultOrg(e.target.value)}
              >
                <option value="all">All Organizations & Personal</option>
                <option value="personal">Personal (@{user?.login})</option>
                {organizations.map((org) => (
                  <option key={org.id || org.login} value={org.login}>
                    {org.name || org.login}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Section 2: Bot PR Filtering */}
          <section className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon">
                <Bot size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 className="settings-heading">Ignore Bot Pull Requests</h3>
                  <label className="gh-toggle-label">
                    <input
                      type="checkbox"
                      checked={currentSettings.ignoreBots}
                      onChange={handleToggleBots}
                    />
                    <span className="gh-toggle-slider" />
                  </label>
                </div>
                <p className="settings-desc">
                  Automatically hide automated pull requests created by bots such as Dependabot, Renovate, Snyk, and GitHub Actions from your review queues.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Display & Tab Preferences */}
          <section className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon">
                <Tag size={16} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="settings-heading">Show &quot;PR I approve&quot; Tab</h3>
                    <label className="gh-toggle-label">
                      <input
                        type="checkbox"
                        checked={currentSettings.showApprovedTab !== false}
                        onChange={handleToggleApprovedTab}
                      />
                      <span className="gh-toggle-slider" />
                    </label>
                  </div>
                  <p className="settings-desc">
                    Toggle visibility of the approved pull requests tab if you want to focus strictly on actionable items (reviews needed and raised PRs).
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="settings-heading">Show Labels on PR Cards</h3>
                    <label className="gh-toggle-label">
                      <input
                        type="checkbox"
                        checked={currentSettings.showLabels !== false}
                        onChange={handleToggleLabels}
                      />
                      <span className="gh-toggle-slider" />
                    </label>
                  </div>
                  <p className="settings-desc">
                    Display repository labels (e.g. bug, enhancement, high-priority) directly next to PR titles.
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="settings-heading">Detailed Creation Timestamps</h3>
                    <label className="gh-toggle-label">
                      <input
                        type="checkbox"
                        checked={currentSettings.showDetailedTimestamp !== false}
                        onChange={handleToggleDetailedTimestamp}
                      />
                      <span className="gh-toggle-slider" />
                    </label>
                  </div>
                  <p className="settings-desc">
                    Display exact relative and calendar time: <code>Created: 2d 1h 52m ago (10 Sep, 4:58 PM)</code>. Turn off for compact relative time (e.g. <code>2d ago</code>).
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="settings-heading">CI / Status Checks</h3>
                    <label className="gh-toggle-label">
                      <input
                        type="checkbox"
                        checked={currentSettings.showCIStatus !== false}
                        onChange={handleToggleCIStatus}
                      />
                      <span className="gh-toggle-slider" />
                    </label>
                  </div>
                  <p className="settings-desc">
                    Show real-time commit check status icons directly on PR cards, matching GitHub.
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="settings-heading">Review Wait Timer (HH : MM)</h3>
                    <label className="gh-toggle-label">
                      <input
                        type="checkbox"
                        checked={currentSettings.showReviewWaitTimer !== false}
                        onChange={handleToggleReviewWaitTimer}
                      />
                      <span className="gh-toggle-slider" />
                    </label>
                  </div>
                  <p className="settings-desc">
                    In the &quot;PR where I am reviewer&quot; tab, show the elapsed wait time since review was requested in <code>HH : MM</code> format (e.g. <code>04 : 32</code>).
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="settings-heading">Reviewer Decisions on Raised PRs</h3>
                    <label className="gh-toggle-label">
                      <input
                        type="checkbox"
                        checked={currentSettings.showReviewerStatus !== false}
                        onChange={handleToggleReviewerStatus}
                      />
                      <span className="gh-toggle-slider" />
                    </label>
                  </div>
                  <p className="settings-desc">
                    Show each requested reviewer&apos;s decision (approved, changes requested, or awaiting review) on pull requests you have raised.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Excluded Repositories */}
          <section className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon">
                <Ban size={16} />
              </div>
              <div>
                <h3 className="settings-heading">Excluded Repositories (Blacklist)</h3>
                <p className="settings-desc">
                  Pull requests from these repositories will be completely excluded from your dashboard and counts.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              {/* Input row */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddExcludedRepo();
                }}
                style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}
              >
                <input
                  type="text"
                  className="gh-input"
                  placeholder="e.g. owner/repository"
                  value={newRepoInput}
                  onChange={(e) => {
                    setNewRepoInput(e.target.value);
                    setInputError('');
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="gh-btn"
                  disabled={!newRepoInput.trim()}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <Plus size={14} /> Add Excluded Repo
                </button>
              </form>

              {inputError && (
                <div style={{ color: 'var(--color-danger-fg)', fontSize: '12px', marginBottom: '0.5rem' }}>
                  {inputError}
                </div>
              )}

              {/* Quick suggestions from user's current repos */}
              {suggestedRepos.length > 0 && (
                <div style={{ marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-fg-muted)', marginRight: '0.5rem' }}>
                    Quick add from active PRs:
                  </span>
                  <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                    {suggestedRepos.map((repo) => (
                      <button
                        key={repo}
                        type="button"
                        className="quick-repo-chip"
                        onClick={() => handleAddExcludedRepo(repo)}
                        title={`Click to exclude ${repo}`}
                      >
                        <Plus size={11} />
                        <span>{repo}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Excluded Repos List */}
              <div className="excluded-repos-box">
                {currentSettings.excludedRepos.length === 0 ? (
                  <div className="excluded-repos-empty">
                    No repositories excluded. Pull requests from all repositories will be tracked.
                  </div>
                ) : (
                  currentSettings.excludedRepos.map((repo) => (
                    <div key={repo} className="excluded-repo-item">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{repo}</span>
                      <button
                        type="button"
                        className="excluded-repo-remove-btn"
                        onClick={() => handleRemoveExcludedRepo(repo)}
                        title={`Stop excluding ${repo}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="gh-modal-footer">
          <button className="gh-primary-btn" onClick={onClose} style={{ width: 'auto', padding: '0.35rem 1rem' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
