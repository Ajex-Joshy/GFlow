import React from 'react';
import { X, Command } from 'lucide-react';

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      category: 'PR Navigation',
      items: [
        { desc: 'Move to next PR card', keys: ['j', 'or', '↓'] },
        { desc: 'Move to previous PR card', keys: ['k', 'or', '↑'] },
        { desc: 'Open selected PR on GitHub', keys: ['Enter', 'or', 'o'] },
      ],
    },
    {
      category: 'View & Tabs',
      items: [
        { desc: 'Switch to "Reviewer" tab', keys: ['1'] },
        { desc: 'Switch to "Raised" tab', keys: ['2'] },
        { desc: 'Switch to "Approved" tab', keys: ['3'] },
      ],
    },
    {
      category: 'General Actions',
      items: [
        { desc: 'Focus search bar', keys: ['/'] },
        { desc: 'Refresh pull requests', keys: ['r'] },
        { desc: 'Close dialog / dismiss focus', keys: ['Esc'] },
        { desc: 'Show keyboard shortcuts', keys: ['?'] },
      ],
    },
  ];

  return (
    <div className="gh-modal-backdrop" onClick={onClose}>
      <div
        className="gh-modal"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="gh-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Command size={18} style={{ color: 'var(--color-fg-muted)' }} />
            <h2 className="gh-modal-title">Keyboard Shortcuts</h2>
          </div>
          <button
            className="gh-modal-close-btn"
            onClick={onClose}
            title="Close shortcuts (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="gh-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {shortcutGroups.map((group) => (
              <div key={group.category}>
                <h4
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--color-fg-muted)',
                    marginBottom: '0.6rem',
                  }}
                >
                  {group.category}
                </h4>
                <div className="shortcuts-list">
                  {group.items.map((item, idx) => (
                    <div key={idx} className="shortcut-row">
                      <span className="shortcut-desc">{item.desc}</span>
                      <div className="shortcut-keys">
                        {item.keys.map((k, i) =>
                          k === 'or' ? (
                            <span
                              key={i}
                              style={{
                                fontSize: '11px',
                                color: 'var(--color-fg-subtle)',
                                margin: '0 2px',
                              }}
                            >
                              or
                            </span>
                          ) : (
                            <kbd key={i} className="gh-kbd">
                              {k}
                            </kbd>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="gh-modal-footer"
          style={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span style={{ fontSize: '12px', color: 'var(--color-fg-muted)' }}>
            Tip: Press <kbd className="gh-kbd">?</kbd> anytime to open this guide.
          </span>
          <button className="gh-btn gh-btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
