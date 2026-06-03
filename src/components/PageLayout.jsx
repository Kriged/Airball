import { Link } from 'react-router-dom';
import './PageLayout.css';

function PageLayout({ title, subtitle, icon, accentColor, bannerImage, children }) {
  return (
    <main className="page-layout">
      {/* Banner */}
      <section className="page-banner" style={{ '--page-accent': accentColor }}>
        <div className="banner-bg">
          <img src={bannerImage} alt="" className="banner-image" />
          <div className="banner-overlay" />
        </div>
        <div className="container banner-content">
          <Link to="/" className="back-link" id="back-to-home">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16 10H4M4 10L9 5M4 10L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Back to Home</span>
          </Link>
          <div className="banner-title-row">
            <span className="banner-icon">{icon}</span>
            <h1 className="banner-title animate-fade-in-up">{title}</h1>
          </div>
          <p className="banner-subtitle animate-fade-in-up delay-1">{subtitle}</p>
        </div>
      </section>

      {/* Content */}
      <section className="page-content">
        <div className="container">
          {children}
        </div>
      </section>
    </main>
  );
}

export default PageLayout;
