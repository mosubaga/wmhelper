import Head from 'next/head';
import Link from 'next/link';

const features = [
  {
    title: 'Scientific Calculator',
    description: 'Evaluate expressions with trigonometric, logarithmic, and exponential functions.',
    href: '/calculator/',
    icon: '='
  },
  {
    title: '2D Plot',
    description: 'Plot up to 5 functions simultaneously with interactive zoom and pan.',
    href: '/plot2d/',
    icon: '~'
  },
  {
    title: '3D Plot',
    description: 'Visualize surfaces z = f(x, y) with interactive 3D rotation.',
    href: '/plot3d/',
    icon: '+'
  },
  {
    title: 'Matrix Calculator',
    description: 'Compute determinants, inverses, eigenvalues, and LU decomposition.',
    href: '/matrix/',
    icon: '[]'
  },
  {
    title: 'Applications',
    description: 'Real-world calculators for loans and investment growth.',
    href: '/applications/',
    icon: '$'
  },
  {
    title: 'LaTeX Preview',
    description: 'Render LaTeX math equations beautifully with KaTeX.',
    href: '/latex/',
    icon: 'fx'
  },
  {
    title: 'Statistics',
    description: 'Import CSV data for descriptive statistics, charts, confidence intervals, tests, and regression.',
    href: '/stats/',
    icon: 'S'
  }
];

export default function Home() {
  return (
    <>
      <Head>
        <title>MathHelper - Interactive Math Tools</title>
        <meta name="description" content="A modern, client-side math web application for students and professionals." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="page-header" style={{ marginBottom: '3rem' }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--s-petal-deep)',
          marginBottom: '0.75rem'
        }}>
          Numerical Mathematics
        </p>
        <h1>Math<span>Helper</span></h1>
        <p>Interactive numerical math tools for students and professionals.<br/>Clean, fast, and works entirely in your browser.</p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem'
      }}>
        {features.map((feature) => (
          <Link key={feature.href} href={feature.href} style={{ textDecoration: 'none' }}>
            <div className="sakura-card s-fade-up" style={{ height: '100%', cursor: 'pointer' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--s-petal) 0%, var(--s-violet) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'SF Mono', monospace",
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'white',
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}>
                  {feature.icon}
                </div>
                <h3 className="sakura-heading sakura-heading-sm">{feature.title}</h3>
              </div>
              <p style={{
                fontSize: '0.88rem',
                color: 'var(--s-ink-soft)',
                lineHeight: 1.6
              }}>
                {feature.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
