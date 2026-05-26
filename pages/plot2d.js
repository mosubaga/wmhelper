import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createEvaluator, parseFunction, generateRange } from '../lib/calculator';

const COLORS = ['#E8899A', '#8B6BB1', '#7A4B3A', '#5a9f68', '#4a7fb5'];
const MAX_FUNCTIONS = 5;
const DEFAULT_RANGE = [-10, 10];
const SAMPLE_POINTS = 500;

export default function Plot2D() {
  const [functions, setFunctions] = useState([
    { id: 1, expr: 'y = sin(x)', visible: true, error: null }
  ]);
  const nextId = useRef(2);
  const [xMin, setXMin] = useState(-10);
  const [xMax, setXMax] = useState(10);
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

  // Update plot when functions or range change
  useEffect(() => {
    if (!Plotly || !plotRef.current) return;

    const xValues = generateRange(xMin, xMax, SAMPLE_POINTS);
    const traces = [];

    functions.forEach((func, idx) => {
      if (!func.visible || !func.expr.trim()) return;

      const parsed = parseFunction(func.expr, 'y');
      // Compile once, evaluate 500× — avoids re-parsing on every data point
      const evaluate = createEvaluator(parsed);
      const yValues = xValues.map(x => evaluate({ x }));

      // Check if all values are null (function failed entirely)
      const allNull = yValues.every(v => v === null);

      if (!allNull) {
        traces.push({
          x: xValues,
          y: yValues,
          type: 'scatter',
          mode: 'lines',
          name: func.expr,
          line: { color: COLORS[idx % COLORS.length], width: 2.5 }
        });
      }
    });

    const layout = {
      paper_bgcolor: 'rgba(255,255,255,0.9)',
      plot_bgcolor: 'rgba(255,255,255,0.95)',
      font: { family: 'Noto Sans JP, sans-serif', color: '#3D2B35' },
      margin: { t: 20, r: 40, b: 50, l: 60 },
      xaxis: {
        title: 'x',
        gridcolor: 'rgba(200,200,200,0.4)',
        zerolinecolor: 'rgba(100,100,100,0.5)',
        zerolinewidth: 1.5
      },
      yaxis: {
        title: 'y',
        gridcolor: 'rgba(200,200,200,0.4)',
        zerolinecolor: 'rgba(100,100,100,0.5)',
        zerolinewidth: 1.5,
        scaleanchor: 'x',
        scaleratio: 1
      },
      dragmode: 'pan',
      showlegend: traces.length > 1,
      legend: { x: 1, xanchor: 'right', y: 1, bgcolor: 'rgba(255,255,255,0.8)' }
    };

    const config = {
      responsive: true,
      scrollZoom: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
      displaylogo: false
    };

    Plotly.react(plotRef.current, traces, layout, config);
  }, [Plotly, functions, xMin, xMax]);

  const addFunction = () => {
    if (functions.length < MAX_FUNCTIONS) {
      setFunctions([...functions, { id: nextId.current++, expr: '', visible: true, error: null }]);
    }
  };

  const removeFunction = (idx) => {
    if (functions.length > 1) {
      setFunctions(functions.filter((_, i) => i !== idx));
    }
  };

  const updateFunction = (idx, expr) => {
    const updated = [...functions];
    updated[idx] = { ...updated[idx], expr };

    // Validate at x=1 (not x=0) — log(x), 1/x, sqrt(x) are undefined at 0
    if (expr.trim()) {
      const parsed = parseFunction(expr, 'y');
      const evaluate = createEvaluator(parsed);
      const isValid = [1, -1, 2].some(x => evaluate({ x }) !== null);
      updated[idx].error = isValid ? null : 'Invalid function';
    } else {
      updated[idx].error = null;
    }

    setFunctions(updated);
  };

  const toggleVisibility = (idx) => {
    const updated = [...functions];
    updated[idx] = { ...updated[idx], visible: !updated[idx].visible };
    setFunctions(updated);
  };

  const clearAll = () => {
    setFunctions([{ id: nextId.current++, expr: '', visible: true, error: null }]);
  };

  const resetView = () => {
    setXMin(-10);
    setXMax(10);
  };

  return (
    <>
      <Head>
        <title>2D Plot - MathHelper</title>
        <meta name="description" content="Plot up to 5 functions with interactive zoom and pan." />
      </Head>

      <div className="page-header">
        <h1>2D <span>Plot</span></h1>
        <p>Enter functions of the form y = f(x). Mouse wheel to zoom, drag to pan.</p>
      </div>

      {/* Function inputs at top */}
      <div className="sakura-card mb-3">
        <div className="function-inputs">
          {functions.map((func, idx) => (
            <div key={func.id} className="function-input-row">
              <div
                className="function-color"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                onClick={() => toggleVisibility(idx)}
                title={func.visible ? 'Click to hide' : 'Click to show'}
              >
                {func.visible ? '' : 'H'}
              </div>
              <input
                type="text"
                className="sakura-input expression-input"
                value={func.expr}
                onChange={(e) => updateFunction(idx, e.target.value)}
                placeholder="y = sin(x)"
                style={{ flex: 1 }}
              />
              {functions.length > 1 && (
                <button
                  className="function-remove-btn"
                  onClick={() => removeFunction(idx)}
                  title="Remove function"
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>

        {functions.some(f => f.error) && (
          <div className="sakura-warning mt-2" style={{ fontSize: '0.85rem' }}>
            {functions.filter(f => f.error).map((f, i) => (
              <div key={i}>{f.expr}: {f.error}</div>
            ))}
          </div>
        )}

        <div className="plot-controls">
          <button
            className="sakura-btn sakura-btn-primary"
            onClick={addFunction}
            disabled={functions.length >= MAX_FUNCTIONS}
          >
            + Add Function
          </button>

          <div className="range-controls">
            <label>
              <span>x min:</span>
              <input
                type="number"
                className="sakura-input range-input"
                value={xMin}
                onChange={(e) => setXMin(parseFloat(e.target.value) || -10)}
              />
            </label>
            <label>
              <span>x max:</span>
              <input
                type="number"
                className="sakura-input range-input"
                value={xMax}
                onChange={(e) => setXMax(parseFloat(e.target.value) || 10)}
              />
            </label>
          </div>

          <div className="control-buttons">
            <button className="sakura-btn sakura-btn-ghost" onClick={resetView}>
              Reset View
            </button>
            <button className="sakura-btn sakura-btn-ghost" onClick={clearAll}>
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Large plot area below */}
      <div className="sakura-card plot-card">
        <div className="plot-container-large" ref={plotRef}>
          {!Plotly && (
            <div className="plot-loading">
              Loading plot...
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .function-inputs {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .function-input-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .function-color {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          flex-shrink: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          color: white;
          font-weight: bold;
          transition: transform 0.2s, opacity 0.2s;
          border: 2px solid rgba(255,255,255,0.5);
        }

        .function-color:hover {
          transform: scale(1.1);
        }

        .function-remove-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid rgba(200,100,100,0.3);
          background: rgba(255,200,200,0.3);
          color: #944;
          cursor: pointer;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .function-remove-btn:hover {
          background: rgba(255,150,150,0.5);
        }

        .plot-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(232,137,154,0.2);
        }

        .range-controls {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .range-controls label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.85rem;
          color: var(--s-ink-soft);
        }

        .range-input {
          width: 80px;
          padding: 0.4rem 0.6rem;
          font-size: 0.85rem;
        }

        .control-buttons {
          display: flex;
          gap: 0.5rem;
          margin-left: auto;
        }

        .plot-card {
          padding: 1rem;
        }

        .plot-container-large {
          width: 100%;
          height: 65vh;
          min-height: 500px;
          max-height: 800px;
          background: rgba(255,255,255,0.95);
          border-radius: var(--r-md);
          border: 1px solid rgba(232,137,154,0.2);
        }

        .plot-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--s-ink-soft);
        }

        @media (max-width: 768px) {
          .plot-controls {
            flex-direction: column;
            align-items: flex-start;
          }

          .range-controls {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .control-buttons {
            margin-left: 0;
            width: 100%;
          }

          .control-buttons button {
            flex: 1;
          }

          .plot-container-large {
            height: 50vh;
            min-height: 350px;
          }
        }
      `}</style>
    </>
  );
}
