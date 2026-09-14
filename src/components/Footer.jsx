import { useSport } from '../context/SportContext';
import './Footer.css';

function Footer() {
  const { config } = useSport();

  const sportTypeLabel = config.name === 'NBA' 
    ? 'Basketball' 
    : config.name === 'NFL' 
      ? 'Football' 
      : 'Combat Sports';

  return (
    <footer className="footer" id="main-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={config.accentColor || 'var(--court-accent)'} strokeWidth="2.2">
            <circle cx="12" cy="12" r="10" />
            <path d="M4.93 4.93l4.24 4.24" />
            <path d="M14.83 9.17l4.24-4.24" />
            <path d="M14.83 14.83l4.24 4.24" />
            <path d="M4.93 19.07l4.24-4.24" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="12" y1="2" x2="12" y2="22" />
          </svg>
          <span className="footer-brand-text">Airball {config.name} Architecture</span>
          <span>• Real-Time Low-Latency {sportTypeLabel} Experience</span>
        </div>

        <div className="footer-spec">
          Multi-Sport Low-Latency API • TTL: 2.0s
        </div>
      </div>
    </footer>
  );
}

export default Footer;

