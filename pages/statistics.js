import Head from 'next/head';
import Link from 'next/link';

export default function Statistics() {
  return (
    <>
      <Head>
        <title>Statistics - Coming Soon - MathHelper</title>
        <meta name="description" content="Statistics tools coming soon." />
      </Head>

      <div className="coming-soon">
        <div className="sakura-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <span className="sakura-badge sakura-badge-violet" style={{ marginBottom: '1.5rem' }}>
            Coming Soon
          </span>

          <h2 className="sakura-heading sakura-heading-lg" style={{ marginBottom: '1rem' }}>
            Statistics <span style={{
              background: 'linear-gradient(135deg, var(--s-petal-deep), var(--s-violet-deep))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Track</span>
          </h2>

          <p style={{ color: 'var(--s-ink-soft)', marginBottom: '2rem', lineHeight: 1.7 }}>
            A comprehensive statistics toolkit is in development. Upload CSV files and analyze your data
            with descriptive statistics, visualizations, and regression tools.
          </p>

          <hr className="sakura-divider" />

          <h3 className="sakura-heading sakura-heading-sm" style={{ marginBottom: '1rem', marginTop: '1.5rem' }}>
            Phase 1 Features
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '0.75rem',
            textAlign: 'left'
          }}>
            {[
              'CSV file upload',
              'Auto-detect numeric columns',
              'Mean, median, mode',
              'Variance & std deviation',
              'Box plots',
              'Histograms',
              'Correlation matrix',
              'Linear regression'
            ].map((feature, idx) => (
              <div key={idx} style={{
                padding: '0.5rem 0.75rem',
                background: 'rgba(249,200,212,0.15)',
                borderRadius: 'var(--r-sm)',
                fontSize: '0.88rem',
                color: 'var(--s-ink)'
              }}>
                {feature}
              </div>
            ))}
          </div>

          <div className="sakura-info" style={{ marginTop: '1.5rem', textAlign: 'left' }}>
            <strong>Dataset guidance:</strong> Recommended 300-400 rows for optimal performance.
            Larger datasets may experience slower processing.
          </div>

          <hr className="sakura-divider" />

          <h3 className="sakura-heading sakura-heading-sm" style={{ marginBottom: '1rem', marginTop: '1.5rem' }}>
            Future Phases
          </h3>

          <div style={{ textAlign: 'left', fontSize: '0.9rem', color: 'var(--s-ink-soft)' }}>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>Phase 2:</strong> Probability distributions (normal, binomial, Poisson),
              sampling & simulation, Monte Carlo experiments, confidence intervals.
            </p>
            <p>
              <strong>Phase 3:</strong> Basic time series, financial statistics (returns, volatility).
            </p>
          </div>

          <Link href="/" className="sakura-btn sakura-btn-primary" style={{ marginTop: '2rem' }}>
            Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
