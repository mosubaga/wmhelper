import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { evaluateExpression } from '../lib/calculator';

export default function Calculator() {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  // Debounced evaluation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (expression.trim()) {
        const { result: res, error: err } = evaluateExpression(expression);
        setResult(res);
        setError(err);
      } else {
        setResult(null);
        setError(null);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [expression]);

  // Add to history on Enter
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && expression.trim() && result !== null && !error) {
      setHistory(prev => {
        const newHistory = [{ expr: expression, result: String(result) }, ...prev];
        return newHistory.slice(0, 20); // Keep last 20
      });
    }
  }, [expression, result, error]);

  // Restore from history
  const restoreFromHistory = (item) => {
    setExpression(item.expr);
  };

  return (
    <>
      <Head>
        <title>Scientific Calculator - MathHelper</title>
        <meta name="description" content="Scientific calculator with trigonometric, logarithmic, and exponential functions." />
      </Head>

      <div className="page-header">
        <h1>Scientific <span>Calculator</span></h1>
        <p>
          Supports sin, cos, tan, ln, log[base](x), exp, sqrt, factorial, and more.
        </p>
      </div>

      <div className="sakura-card">
        <div className="mb-3">
          <label className="sakura-label">Expression</label>
          <input
            type="text"
            className="sakura-input expression-input"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., sin(pi/4) + sqrt(2)"
            autoFocus
          />
        </div>

        <div className={`result-display ${error ? 'error' : ''}`}>
          {error ? error : (result !== null ? result : '...')}
        </div>

        <div className="mt-3">
          <p style={{ fontSize: '0.75rem', color: 'var(--s-ink-soft)' }}>
            Available: +, -, *, /, ^ (power), sin, cos, tan, asin, acos, atan, ln (natural log), log[base](x) (e.g. log[10](100)), exp, sqrt, abs, factorial, pi, e
          </p>
        </div>
      </div>

      {history.length > 0 && (
        <div className="sakura-card mt-3">
          <h3 className="sakura-heading sakura-heading-sm mb-2">History</h3>
          <div className="history-list">
            {history.map((item, idx) => (
              <div
                key={idx}
                className="history-item"
                onClick={() => restoreFromHistory(item)}
              >
                <span className="expr">{item.expr}</span>
                <span className="result">= {item.result}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
