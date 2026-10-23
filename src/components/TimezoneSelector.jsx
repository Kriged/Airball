import { useState, useRef, useEffect } from 'react';
import { useTimezone } from '../context/useTimezone';
import './TimezoneSelector.css';

function TimezoneSelector({ compact = false }) {
  const {
    timezone,
    timezoneAbbr,
    isAuto,
    setTimezone,
    popularTimezones,
    detectedTimezone,
  } = useTimezone();

  const [isOpen, setIsOpen] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const dropdownRef = useRef(null);

  // Update current live time display for the active timezone
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(now);
        setCurrentTimeStr(formatted);
      } catch {
        setCurrentTimeStr('');
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (tzValue) => {
    setTimezone(tzValue);
    setIsOpen(false);
  };

  return (
    <div className="tz-selector-container" ref={dropdownRef}>
      <button
        type="button"
        className={`tz-pill-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Timezone: ${timezoneAbbr}. Click to change.`}
        aria-expanded={isOpen}
        title={`Active Timezone: ${timezone} (${timezoneAbbr})`}
        id="timezone-selector-btn"
      >
        <span className="tz-icon">🌐</span>
        <span className="tz-abbr">{timezoneAbbr}</span>
        {!compact && isAuto && <span className="tz-auto-tag">Auto</span>}
        <span className="tz-chevron">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="glass-panel tz-dropdown-menu" role="menu">
          <div className="tz-dropdown-header">
            <div className="tz-header-title-row">
              <span className="tz-header-title">Game Timezone</span>
              <span className="tz-current-clock">{currentTimeStr}</span>
            </div>
            <p className="tz-header-sub">
              Schedules &amp; match clocks automatically sync to your selected timezone.
            </p>
          </div>

          <div className="tz-options-list">
            {/* Auto Detect Option */}
            <button
              type="button"
              className={`tz-option-item auto-opt ${isAuto ? 'selected' : ''}`}
              onClick={() => handleSelect('auto')}
              role="menuitem"
            >
              <div className="tz-opt-left">
                <span className="tz-opt-icon">⚡</span>
                <div>
                  <div className="tz-opt-name">
                    Auto-Detect ({detectedTimezone})
                  </div>
                  <div className="tz-opt-meta">Detected from your browser</div>
                </div>
              </div>
              {isAuto && <span className="tz-check">✓</span>}
            </button>

            <div className="tz-divider" />

            {/* Popular Timezones */}
            {popularTimezones
              .filter((tz) => tz.value !== 'auto')
              .map((tz) => {
                const isSelected = !isAuto && timezone === tz.value;
                return (
                  <button
                    key={tz.value}
                    type="button"
                    className={`tz-option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(tz.value)}
                    role="menuitem"
                  >
                    <div className="tz-opt-left">
                      <span className="tz-opt-badge">{tz.abbr}</span>
                      <div>
                        <div className="tz-opt-name">{tz.label}</div>
                        <div className="tz-opt-region">{tz.region}</div>
                      </div>
                    </div>
                    {isSelected && <span className="tz-check">✓</span>}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

export default TimezoneSelector;
