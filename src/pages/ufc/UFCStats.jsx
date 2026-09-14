import PageLayout from '../../components/PageLayout';
import './UFC.css';

function UFCStats() {
  // UFC stats are limited from ESPN's public API
  return (
    <PageLayout title="UFC Stats" subtitle="Striking, takedown, and submission leaderboards" icon="📊" accentColor="#D20A0A" bannerImage="/images/stats.png">
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <p className="empty-state-text">UFC fighter statistics are being compiled. Check back after the next event for updated leaderboards.</p>
        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', maxWidth: '600px', margin: '20px auto 0' }}>
          {['Striking Accuracy', 'Takedown Accuracy', 'Submission Average', 'Finish Rate'].map(stat => (
            <div key={stat} className="glass-panel" style={{ borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--court-gold)', marginBottom: '8px' }}>{stat}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--court-text-muted)' }}>Coming Soon</div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}

export default UFCStats;
