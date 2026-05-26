import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createEvaluator, parseFunction, generateRange } from '../lib/calculator';

const DEFAULT_RANGE = [-5, 5];
const GRID_SIZE = 50;

export default function Plot3D() {
  const [expression, setExpression] = useState('z = sin(x) * cos(y)');
  const [xRange, setXRange] = useState({ min: -5, max: 5 });
  const [yRange, setYRange] = useState({ min: -5, max: 5 });
  const [showGrid, setShowGrid] = useState(true);
  const [error, setError] = useState(null);

  const plotRef = useRef(null);
  const [Plotly, setPlotly] = useState(null);

  // Dynamic import of Plotly; purge on unmount to avoid memory leaks
  useEffect(() => {
    import('plotly.js-dist-min').then((module) => {
      setPlotly(module.default);
    });
    return () => {
      if (plotRef.current) {
        import('plotly.js-dist-min').then((m) => m.default.purge(plotRef.current));
      }
    };
  }, []);

  // Update plot
  useEffect(() => {
    if (!Plotly || !plotRef.current) return;

    const parsed = parseFunction(expression, 'z');
    if (!parsed.trim()) {
      setError('Please enter a function');
      return;
    }

    const xValues = generateRange(xRange.min, xRange.max, GRID_SIZE);
    const yValues = generateRange(yRange.min, yRange.max, GRID_SIZE);

    // Compile once, evaluate 2500× — avoids re-parsing on every grid point
    const evaluate = createEvaluator(parsed);
    const zValues = [];
    let allNull = true;

    for (let j = 0; j < yValues.length; j++) {
      const row = [];
      for (let i = 0; i < xValues.length; i++) {
        const z = evaluate({ x: xValues[i], y: yValues[j] });
        row.push(z);
        if (z !== null) allNull = false;
      }
      zValues.push(row);
    }

    if (allNull) {
      setError('Failed to evaluate surface. Check your expression.');
      Plotly.purge(plotRef.current);
      return;
    }

    setError(null);

    const trace = {
      type: 'surface',
      x: xValues,
      y: yValues,
      z: zValues,
      colorscale: [
        [0, '#FDE8EE'],
        [0.25, '#F9C8D4'],
        [0.5, '#E8899A'],
        [0.75, '#BBA3D8'],
        [1, '#8B6BB1']
      ],
      showscale: true,
      colorbar: {
        tickfont: { color: '#3D2B35' }
      }
    };

    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'Noto Sans JP, sans-serif', color: '#3D2B35' },
      margin: { t: 30, r: 30, b: 30, l: 30 },
      scene: {
        xaxis: {
          title: 'x',
          gridcolor: 'rgba(232,137,154,0.3)',
          showgrid: showGrid
        },
        yaxis: {
          title: 'y',
          gridcolor: 'rgba(187,163,216,0.3)',
          showgrid: showGrid
        },
        zaxis: {
          title: 'z',
          gridcolor: 'rgba(122,75,58,0.2)',
          showgrid: showGrid
        },
        bgcolor: 'rgba(255,255,255,0.3)'
      }
    };

    Plotly.react(plotRef.current, [trace], layout, { responsive: true });
  }, [Plotly, expression, xRange, yRange, showGrid]);

  const handleRangeChange = (axis, bound, value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;

    if (axis === 'x') {
      setXRange(prev => ({ ...prev, [bound]: num }));
    } else {
      setYRange(prev => ({ ...prev, [bound]: num }));
    }
  };

  return (
    <>
      <Head>
        <title>3D Plot - MathHelper</title>
        <meta name="description" content="Visualize 3D surfaces z = f(x, y) with interactive rotation." />
      </Head>

      <div className="page-header">
        <h1>3D <span>Plot</span></h1>
        <p>Visualize surfaces of the form z = f(x, y). Drag to rotate, scroll to zoom.</p>
      </div>

      <div className="grid-2">
        <div className="sakura-card">
          <div className="mb-3">
            <label className="sakura-label">Function</label>
            <input
              type="text"
              className="sakura-input expression-input"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="z = sin(x) * cos(y)"
            />
          </div>

          <div className="grid-3 mb-3">
            <div>
              <label className="sakura-label">X Min</label>
              <input
                type="number"
                className="sakura-input"
                value={xRange.min}
                onChange={(e) => handleRangeChange('x', 'min', e.target.value)}
              />
            </div>
            <div>
              <label className="sakura-label">X Max</label>
              <input
                type="number"
                className="sakura-input"
                value={xRange.max}
                onChange={(e) => handleRangeChange('x', 'max', e.target.value)}
              />
            </div>
            <div></div>
            <div>
              <label className="sakura-label">Y Min</label>
              <input
                type="number"
                className="sakura-input"
                value={yRange.min}
                onChange={(e) => handleRangeChange('y', 'min', e.target.value)}
              />
            </div>
            <div>
              <label className="sakura-label">Y Max</label>
              <input
                type="number"
                className="sakura-input"
                value={yRange.max}
                onChange={(e) => handleRangeChange('y', 'max', e.target.value)}
              />
            </div>
          </div>

          <button
            className={`sakura-btn ${showGrid ? 'sakura-btn-primary' : 'sakura-btn-ghost'}`}
            onClick={() => setShowGrid(!showGrid)}
          >
            {showGrid ? 'Hide Grid' : 'Show Grid'}
          </button>

          {error && <div className="sakura-error mt-2">{error}</div>}
        </div>

        <div className="sakura-card">
          <div className="plot-container" ref={plotRef} style={{ minHeight: '450px' }}>
            {!Plotly && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '450px',
                color: 'var(--s-ink-soft)'
              }}>
                Loading plot...
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
