import './Footer.css';

function Footer() {
  return (
    <footer className="footer" id="main-footer">
      <div className="footer-glow" />
      <div className="container footer-inner">
        <div className="footer-brand">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="footer-logo">
            <circle cx="20" cy="20" r="18" stroke="#e63946" strokeWidth="2" fill="none" opacity="0.6" />
            <path d="M20 2 Q20 20 20 38" stroke="#e63946" strokeWidth="1.2" fill="none" opacity="0.6" />
            <path d="M2 20 Q20 20 38 20" stroke="#e63946" strokeWidth="1.2" fill="none" opacity="0.6" />
          </svg>
          <span className="footer-brand-text">Airball</span>
        </div>
        <p className="footer-copy">
          &copy; {new Date().getFullYear()} Airball. Built with React &amp; Vite.
        </p>
        <div className="footer-links">
          <span className="footer-badge">🏀 Hoops Data</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
