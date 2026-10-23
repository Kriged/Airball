import { useEffect, useState } from 'react';
import { useTimezone } from '../context/useTimezone';
import './SettingsModal.css';

function SettingsModal({ delaySeconds, setDelaySeconds, onClose }) {
  const { timezone, isAuto, setTimezone, popularTimezones, detectedTimezone } = useTimezone();
  const [selectedTz, setSelectedTz] = useState(isAuto ? 'auto' : timezone);
  const [localDelay, setLocalDelay] = useState(delaySeconds || 0);
  const [leadChanges, setLeadChanges] = useState(true);
  const [buzzerBeaters, setBuzzerBeaters] = useState(true);
  const [foulTrouble, setFoulTrouble] = useState(true);
  const [everyScore, setEveryScore] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleSave = () => {
    setDelaySeconds(localDelay);
    setTimezone(selectedTz);
    onClose();
  };

  return (
    <div className="settings-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
      <div className="glass-panel settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <span className="settings-modal-title" id="settings-modal-title">Stream Sync &amp; Notification Engine</span>
          <button className="player-close-btn" onClick={onClose} aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Timezone Preference */}
        <div className="settings-section">
          <div className="settings-label-row">
            <span>Match &amp; Schedule Timezone</span>
            <span className="settings-delay-val">
              {selectedTz === 'auto' ? `Auto (${detectedTimezone})` : selectedTz}
            </span>
          </div>
          <p className="settings-desc">
            All game times, schedules, and event kickoffs adapt automatically to this timezone.
          </p>
          <select
            value={selectedTz}
            onChange={(e) => setSelectedTz(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {popularTimezones.map((tz) => (
              <option key={tz.value} value={tz.value} style={{ background: '#1c1c1e', color: '#ffffff' }}>
                {tz.value === 'auto' ? `Auto-Detect (${detectedTimezone})` : tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Delay Slider */}
        <div className="settings-section">
          <div className="settings-label-row">
            <span>Broadcast Stream Delay Buffer</span>
            <span className="settings-delay-val">
              {localDelay === 0 ? '0s (Live Real-Time)' : `+${localDelay}s Delay`}
            </span>
          </div>
          <p className="settings-desc">
            Eliminate push alert spoilers when your video stream (League Pass, ESPN, TNT) is 15–45 seconds behind real-time court events.
          </p>
          <input
            type="range"
            min="0"
            max="90"
            step="5"
            value={localDelay}
            onChange={(e) => setLocalDelay(Number(e.target.value))}
            className="settings-slider"
          />
        </div>

        {/* Notification triggers */}
        <div className="settings-triggers-group">
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF' }}>
            Live Basketball Event Triggers
          </span>

          <label className="settings-trigger-item">
            <span>Lead Changes &amp; Crunch Time (Q4 &lt; 3m within 5pts)</span>
            <input
              type="checkbox"
              className="settings-checkbox"
              checked={leadChanges}
              onChange={(e) => setLeadChanges(e.target.checked)}
            />
          </label>

          <label className="settings-trigger-item">
            <span>Buzzer Beaters &amp; Highlight Dunks</span>
            <input
              type="checkbox"
              className="settings-checkbox"
              checked={buzzerBeaters}
              onChange={(e) => setBuzzerBeaters(e.target.checked)}
            />
          </label>

          <label className="settings-trigger-item">
            <span>Foul Trouble (Player reaches 5th personal foul)</span>
            <input
              type="checkbox"
              className="settings-checkbox"
              checked={foulTrouble}
              onChange={(e) => setFoulTrouble(e.target.checked)}
            />
          </label>

          <label className="settings-trigger-item">
            <span>Every Scoring Play (High frequency)</span>
            <input
              type="checkbox"
              className="settings-checkbox"
              checked={everyScore}
              onChange={(e) => setEveryScore(e.target.checked)}
            />
          </label>
        </div>

        <div className="settings-modal-actions">
          <button className="settings-save-btn" onClick={handleSave}>
            Save Stream Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
