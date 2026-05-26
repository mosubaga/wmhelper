import { useState } from 'react';
import Head from 'next/head';
import {
  computeDeterminant,
  computeInverse,
  computeEigen,
  computeLU,
  validateMatrix,
  toNumericMatrix
} from '../lib/matrix';

const SIZES = [2, 3, 4, 5];

function createEmptyMatrix(n) {
  return Array(n).fill(null).map(() => Array(n).fill(''));
}

export default function MatrixCalculator() {
  const [size, setSize] = useState(3);
  const [matrix, setMatrix] = useState(() => createEmptyMatrix(3));
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);

  const handleSizeChange = (newSize) => {
    setSize(newSize);
    setMatrix(createEmptyMatrix(newSize));
    setResults(null);
    setError(null);
    setWarning(null);
  };

  const handleCellChange = (row, col, value) => {
    const updated = matrix.map((r, i) =>
      i === row ? r.map((c, j) => (j === col ? value : c)) : r
    );
    setMatrix(updated);
  };

  const compute = () => {
    setError(null);
    setWarning(null);
    setResults(null);

    // Validate
    const validation = validateMatrix(matrix);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    const numericMatrix = toNumericMatrix(matrix);

    // Compute all operations
    const det = computeDeterminant(numericMatrix);
    const inv = computeInverse(numericMatrix);
    const eigen = computeEigen(numericMatrix);
    const lu = computeLU(numericMatrix);

    // Check for warnings
    if (inv.warning) {
      setWarning(inv.warning);
    }

    setResults({
      determinant: det,
      inverse: inv,
      eigen,
      lu
    });
  };

  const clearMatrix = () => {
    setMatrix(createEmptyMatrix(size));
    setResults(null);
    setError(null);
    setWarning(null);
  };

  return (
    <>
      <Head>
        <title>Matrix Calculator - MathHelper</title>
        <meta name="description" content="Compute determinants, inverses, eigenvalues, and LU decomposition." />
      </Head>

      <div className="page-header">
        <h1>Matrix <span>Calculator</span></h1>
        <p>Compute determinant, inverse, eigenvalues, eigenvectors, and LU decomposition.</p>
      </div>

      <div className="grid-2">
        <div className="sakura-card">
          <div className="mb-3">
            <label className="sakura-label">Matrix Size</label>
            <div className="flex gap-1 flex-wrap">
              {SIZES.map(n => (
                <button
                  key={n}
                  className={`sakura-chip ${size === n ? 'active' : ''}`}
                  onClick={() => handleSizeChange(n)}
                >
                  {n}x{n}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="sakura-label">Matrix Input</label>
            <div
              className="matrix-grid"
              style={{ gridTemplateColumns: `repeat(${size}, 70px)` }}
            >
              {matrix.map((row, i) =>
                row.map((cell, j) => (
                  <input
                    key={`${i}-${j}`}
                    type="text"
                    className="sakura-input matrix-cell"
                    value={cell}
                    onChange={(e) => handleCellChange(i, j, e.target.value)}
                    placeholder="0"
                  />
                ))
              )}
            </div>
          </div>

          <div className="flex gap-1">
            <button className="sakura-btn sakura-btn-primary" onClick={compute}>
              Compute
            </button>
            <button className="sakura-btn sakura-btn-ghost" onClick={clearMatrix}>
              Clear
            </button>
          </div>

          {error && <div className="sakura-error mt-2">{error}</div>}
          {warning && <div className="sakura-warning mt-2">{warning}</div>}
        </div>

        <div className="sakura-card">
          <h3 className="sakura-heading sakura-heading-sm mb-2">Results</h3>

          {!results ? (
            <p style={{ color: 'var(--s-ink-soft)' }}>
              Enter matrix values and click Compute to see results.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Determinant */}
              <div>
                <label className="sakura-label">Determinant</label>
                <div className="matrix-result">
                  {results.determinant.error || results.determinant.result}
                </div>
              </div>

              {/* Inverse */}
              <div>
                <label className="sakura-label">Inverse</label>
                {results.inverse.error ? (
                  <div className="sakura-error">{results.inverse.error}</div>
                ) : (
                  <div className="matrix-result">
                    <MatrixDisplay matrix={results.inverse.result} />
                  </div>
                )}
              </div>

              {/* Eigenvalues */}
              <div>
                <label className="sakura-label">Eigenvalues</label>
                {results.eigen.error ? (
                  <div className="sakura-error">{results.eigen.error}</div>
                ) : (
                  <div className="matrix-result">
                    {results.eigen.eigenvalues.map((val, i) => (
                      <div key={i}>l{i + 1} = {val}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Eigenvectors */}
              {results.eigen.eigenvectors && (
                <div>
                  <label className="sakura-label">Eigenvector Matrix</label>
                  <div className="matrix-result">
                    <MatrixDisplay matrix={results.eigen.eigenvectors} />
                  </div>
                </div>
              )}

              {/* LU Decomposition */}
              <div>
                <label className="sakura-label">LU Decomposition</label>
                {results.lu.error ? (
                  <div className="sakura-error">{results.lu.error}</div>
                ) : (
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>L (Lower)</div>
                      <div className="matrix-result">
                        <MatrixDisplay matrix={results.lu.L} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>U (Upper)</div>
                      <div className="matrix-result">
                        <MatrixDisplay matrix={results.lu.U} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MatrixDisplay({ matrix }) {
  if (!matrix) return null;

  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <tbody>
        {matrix.map((row, i) => (
          <tr key={i}>
            {row.map((val, j) => (
              <td
                key={j}
                style={{
                  padding: '0.25rem 0.75rem',
                  textAlign: 'right',
                  borderLeft: j === 0 ? '2px solid var(--s-petal-deep)' : 'none',
                  borderRight: j === row.length - 1 ? '2px solid var(--s-petal-deep)' : 'none'
                }}
              >
                {val}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
