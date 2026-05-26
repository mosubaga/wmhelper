import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Head from 'next/head';
import {
  parseCSVHeaders,
  parseCSVWithColumns,
  computeDescriptive,
  computeCI,
  computeOneSampleT,
  computeTwoSampleT,
  computeRegression,
  combination,
  permutation,
} from '../lib/stats';

const CHART_COLORS = ['#E8899A', '#8B6BB1', '#7A4B3A', '#5a9f68', '#4a7fb5',
  '#d98c50', '#6bc4c4', '#d45f8e', '#8b9e40', '#5a6eb5'];
const MAX_DATASETS = 10;
const MAX_ROWS = 500;

const fmt = (v, d = 4) => (v == null || !isFinite(v)) ? '—' : Number(v).toFixed(d);
const fmtP = (p) => {
  if (p == null || !isFinite(p)) return '—';
  return p < 0.001 ? '< 0.001' : p.toFixed(4);
};
const fmtSci = (v) => {
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a === 0) return '0';
  if (a >= 1e6 || (a > 0 && a < 1e-4)) return v.toExponential(4);
  return v.toPrecision(6).replace(/\.?0+$/, '');
};

// ── Reusable helpers ───────────────────────────────────────────────────────

function ColSelect({ label, columns, value, onChange, placeholder = 'Select column' }) {
  return (
    <div className="mb-2">
      {label && <label className="sakura-label">{label}</label>}
      <select
        className="sakura-select"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%' }}
      >
        <option value="">{placeholder}</option>
        {columns.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}

function DatasetSelect({ datasets, activeIdx, onChange, label = 'Active Dataset' }) {
  return (
    <div className="mb-2">
      <label className="sakura-label">{label}</label>
      <select
        className="sakura-select"
        value={activeIdx ?? ''}
        onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
        style={{ width: '100%' }}
      >
        <option value="">— choose dataset —</option>
        {datasets.map((ds, i) => (
          <option key={i} value={i}>
            {ds.name} ({ds.rowCount} rows · {ds.columnNames.length} cols)
          </option>
        ))}
      </select>
    </div>
  );
}

function StatRow({ label, value, mono = true }) {
  return (
    <tr>
      <td style={{
        padding: '0.38rem 0.9rem',
        color: 'var(--s-ink-soft)',
        fontSize: '0.86rem',
        fontFamily: 'var(--font-display)',
        borderBottom: '1px solid rgba(249,200,212,0.20)',
        whiteSpace: 'nowrap',
      }}>{label}</td>
      <td style={{
        padding: '0.38rem 0.9rem',
        textAlign: 'right',
        fontFamily: mono ? "'SF Mono', 'Fira Code', monospace" : 'var(--font-body)',
        fontSize: '0.88rem',
        color: 'var(--s-ink)',
        borderBottom: '1px solid rgba(249,200,212,0.20)',
      }}>{value}</td>
    </tr>
  );
}

function InlineWarn({ msg }) {
  return msg ? <div className="sakura-warning" style={{ marginTop: '0.75rem' }}>{msg}</div> : null;
}

function InlineErr({ msg }) {
  return msg ? <div className="sakura-error" style={{ marginTop: '0.75rem' }}>{msg}</div> : null;
}

function NoData({ text = 'No dataset loaded. Go to the Data tab to import a CSV.' }) {
  return (
    <div className="sakura-info" style={{ textAlign: 'center', padding: '2rem' }}>
      {text}
    </div>
  );
}

// ── Plotly layout preset ───────────────────────────────────────────────────

function sakuraLayout(overrides = {}) {
  return {
    paper_bgcolor: 'rgba(255,255,255,0.9)',
    plot_bgcolor: 'rgba(255,255,255,0.95)',
    font: { family: 'Noto Sans JP, sans-serif', color: '#3D2B35', size: 12 },
    margin: { t: 30, r: 20, b: 55, l: 60 },
    autosize: true,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Page ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState('data');

  // ── Dataset state ─────────────────────────────────────────────────────────
  const [datasets, setDatasets] = useState([]);
  const [activeDatasetIdx, setActiveDatasetIdx] = useState(null);

  // ── CSV import state ──────────────────────────────────────────────────────
  const [csvParsed, setCsvParsed] = useState(null);
  const [selectedCols, setSelectedCols] = useState([]);
  const [maxColsInput, setMaxColsInput] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [importError, setImportError] = useState('');
  const [importWarnings, setImportWarnings] = useState([]);
  const fileInputRef = useRef(null);

  // ── Descriptive tab ───────────────────────────────────────────────────────
  const [descCol, setDescCol] = useState('');

  // ── Charts tab ────────────────────────────────────────────────────────────
  const [chartType, setChartType] = useState('histogram');
  const [chartColX, setChartColX] = useState('');
  const [chartColY, setChartColY] = useState('');
  const chartRef = useRef(null);

  // ── Inference tab ─────────────────────────────────────────────────────────
  const [inferTab, setInferTab] = useState('ci');
  const [inferCol1, setInferCol1] = useState('');
  const [inferCol2, setInferCol2] = useState('');
  const [inferDs2Idx, setInferDs2Idx] = useState(null);
  const [confidenceLevel, setConfidenceLevel] = useState('0.95');
  const [mu0Input, setMu0Input] = useState('0');

  // ── Regression tab ────────────────────────────────────────────────────────
  const [regColX, setRegColX] = useState('');
  const [regColY, setRegColY] = useState('');
  const regChartRef = useRef(null);

  // ── Combo/Perm tab ────────────────────────────────────────────────────────
  const [cnInput, setCnInput] = useState('');
  const [crInput, setCrInput] = useState('');

  // ── Plotly ────────────────────────────────────────────────────────────────
  const [Plotly, setPlotly] = useState(null);

  useEffect(() => {
    import('plotly.js-dist-min').then(m => setPlotly(m.default));
    return () => {
      const purge = (ref) => {
        if (ref.current) import('plotly.js-dist-min').then(m => m.default.purge(ref.current));
      };
      purge(chartRef);
      purge(regChartRef);
    };
  }, []);

  const activeDataset = activeDatasetIdx !== null ? datasets[activeDatasetIdx] ?? null : null;

  // Reset column selectors when active dataset changes
  useEffect(() => {
    if (!activeDataset) return;
    const cols = activeDataset.columnNames;
    setDescCol(cols[0] || '');
    setChartColX(cols[0] || '');
    setChartColY(cols[1] || cols[0] || '');
    setInferCol1(cols[0] || '');
    setInferCol2(cols[1] || cols[0] || '');
    setRegColX(cols[0] || '');
    setRegColY(cols[1] || cols[0] || '');
  }, [activeDatasetIdx]);

  // ── CSV Handlers ──────────────────────────────────────────────────────────

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportError('Only .csv files are accepted. Please choose a CSV file.');
      setCsvParsed(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = parseCSVHeaders(evt.target.result);
        setCsvParsed(parsed);
        setSelectedCols(parsed.headers.map((_, i) => i));
        setMaxColsInput(String(parsed.headers.length));
        setDatasetName(file.name.replace(/\.csv$/i, ''));
        setImportError('');
        setImportWarnings([]);
      } catch (err) {
        setImportError(err.message);
        setCsvParsed(null);
      }
    };
    reader.onerror = () => setImportError('Failed to read the file. Please try again.');
    reader.readAsText(file);
  }, []);

  const handleMaxColsChange = (val) => {
    setMaxColsInput(val);
    const n = parseInt(val);
    if (!isNaN(n) && n > 0) {
      setSelectedCols(prev => prev.slice(0, n));
    }
  };

  const toggleColumn = (idx) => {
    const maxN = parseInt(maxColsInput) || (csvParsed?.headers.length ?? 999);
    if (selectedCols.includes(idx)) {
      setSelectedCols(prev => prev.filter(i => i !== idx));
    } else if (selectedCols.length >= maxN) {
      setImportError(`Column limit is ${maxN}. Deselect another column first, or increase the limit.`);
    } else {
      setImportError('');
      setSelectedCols(prev => [...prev, idx].sort((a, b) => a - b));
    }
  };

  const handleImport = () => {
    if (datasets.length >= MAX_DATASETS) {
      setImportError(`Maximum ${MAX_DATASETS} datasets reached. Delete one to add more.`);
      return;
    }
    if (!datasetName.trim()) {
      setImportError('Please enter a name for this dataset.');
      return;
    }
    if (selectedCols.length === 0) {
      setImportError('Please select at least one column to import.');
      return;
    }
    try {
      const result = parseCSVWithColumns(
        csvParsed.rawLines, csvParsed.headers, selectedCols, MAX_ROWS
      );
      const newDs = {
        name: datasetName.trim(),
        columnNames: result.columnNames,
        columns: result.columns,
        rowCount: result.rowCount,
      };
      const newDatasets = [...datasets, newDs];
      setDatasets(newDatasets);
      setActiveDatasetIdx(newDatasets.length - 1);
      setImportWarnings(result.warnings);
      setImportError('');
      setCsvParsed(null);
      setSelectedCols([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setImportError(err.message);
    }
  };

  const deleteDataset = (idx) => {
    const next = datasets.filter((_, i) => i !== idx);
    setDatasets(next);
    setActiveDatasetIdx(prev => {
      if (prev === null) return null;
      if (prev === idx) return next.length > 0 ? 0 : null;
      return prev > idx ? prev - 1 : prev;
    });
  };

  // ── Chart rendering ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!Plotly || !chartRef.current || !activeDataset || !chartColX) return;
    const xData = activeDataset.columns[chartColX] || [];
    if (xData.length === 0) return;
    const yData = activeDataset.columns[chartColY] || [];
    const color = CHART_COLORS[activeDatasetIdx % CHART_COLORS.length];

    let traces = [], layoutExtra = {};

    if (chartType === 'histogram') {
      traces = [{ x: xData, type: 'histogram', name: chartColX,
        marker: { color, opacity: 0.78, line: { color: '#fff', width: 0.8 } },
        nbinsx: Math.min(Math.ceil(Math.sqrt(xData.length)), 30) }];
      layoutExtra = { xaxis: { title: chartColX }, yaxis: { title: 'Count' } };

    } else if (chartType === 'box') {
      traces = [{ y: xData, type: 'box', name: chartColX,
        marker: { color }, boxmean: 'sd', boxpoints: 'outliers',
        line: { color }, fillcolor: color + '55' }];
      layoutExtra = { yaxis: { title: chartColX } };

    } else if (chartType === 'violin') {
      traces = [{ y: xData, type: 'violin', name: chartColX,
        box: { visible: true }, meanline: { visible: true },
        fillcolor: color + '66', opacity: 0.7,
        line: { color }, points: 'outliers' }];
      layoutExtra = { yaxis: { title: chartColX } };

    } else if (chartType === 'scatter') {
      if (!chartColY || yData.length === 0) return;
      traces = [{ x: xData, y: yData, type: 'scatter', mode: 'markers',
        name: `${chartColX} vs ${chartColY}`,
        marker: { color, opacity: 0.72, size: 7 } }];
      layoutExtra = { xaxis: { title: chartColX }, yaxis: { title: chartColY } };

    } else if (chartType === 'dot') {
      const jitter = xData.map(() => (Math.random() - 0.5) * 0.5);
      traces = [{ x: xData, y: jitter, type: 'scatter', mode: 'markers',
        name: chartColX, marker: { color, size: 7, opacity: 0.72 } }];
      layoutExtra = { xaxis: { title: chartColX },
        yaxis: { title: '', showticklabels: false, zeroline: false, showgrid: false, range: [-1, 1] } };

    } else if (chartType === 'bar') {
      const bins = Math.min(Math.max(5, Math.ceil(Math.sqrt(xData.length))), 25);
      const mn = Math.min(...xData), mx = Math.max(...xData);
      const bw = (mx - mn) / bins || 1;
      const counts = new Array(bins).fill(0);
      const labels = Array.from({ length: bins }, (_, i) => {
        const lo = mn + i * bw;
        return `${lo.toFixed(2)}-${(lo + bw).toFixed(2)}`;
      });
      xData.forEach(v => {
        const bi = Math.min(Math.floor((v - mn) / bw), bins - 1);
        if (bi >= 0) counts[bi]++;
      });
      traces = [{ x: labels, y: counts, type: 'bar', name: chartColX,
        marker: { color, opacity: 0.82 } }];
      layoutExtra = { xaxis: { title: chartColX, tickangle: -30 }, yaxis: { title: 'Count' } };

    } else if (chartType === 'pie') {
      const bins = Math.min(Math.max(3, Math.ceil(Math.sqrt(xData.length))), 10);
      const mn = Math.min(...xData), mx = Math.max(...xData);
      const bw = (mx - mn) / bins || 1;
      const counts = new Array(bins).fill(0);
      const labels = Array.from({ length: bins }, (_, i) => {
        const lo = mn + i * bw;
        return `${lo.toFixed(1)}–${(lo + bw).toFixed(1)}`;
      });
      xData.forEach(v => {
        const bi = Math.min(Math.floor((v - mn) / bw), bins - 1);
        if (bi >= 0) counts[bi]++;
      });
      traces = [{ labels, values: counts, type: 'pie',
        marker: { colors: CHART_COLORS }, textinfo: 'label+percent',
        hoverinfo: 'label+value+percent' }];
      layoutExtra = { margin: { t: 30, r: 10, b: 10, l: 10 } };
    }

    if (traces.length > 0) {
      Plotly.react(chartRef.current, traces,
        sakuraLayout(layoutExtra), { responsive: true, displaylogo: false });
    }
  }, [Plotly, chartType, chartColX, chartColY, activeDatasetIdx, datasets]);

  // ── Regression chart ──────────────────────────────────────────────────────

  const regResult = useMemo(() => {
    if (!activeDataset || !regColX || !regColY || regColX === regColY) return null;
    const xV = activeDataset.columns[regColX];
    const yV = activeDataset.columns[regColY];
    if (!xV || !yV) return null;
    try { return computeRegression(xV, yV); } catch { return null; }
  }, [activeDataset, regColX, regColY]);

  useEffect(() => {
    if (!Plotly || !regChartRef.current || !activeDataset || !regColX || !regColY || !regResult) return;
    const xV = activeDataset.columns[regColX] || [];
    const yV = activeDataset.columns[regColY] || [];
    const xMn = Math.min(...xV), xMx = Math.max(...xV);
    const lineX = [xMn, xMx];
    const lineY = lineX.map(x => regResult.slope * x + regResult.intercept);

    Plotly.react(regChartRef.current, [
      { x: xV, y: yV, type: 'scatter', mode: 'markers', name: 'Data',
        marker: { color: CHART_COLORS[0], size: 7, opacity: 0.72 } },
      { x: lineX, y: lineY, type: 'scatter', mode: 'lines', name: 'Fit',
        line: { color: CHART_COLORS[1], width: 2.5 } },
    ], sakuraLayout({
      xaxis: { title: regColX },
      yaxis: { title: regColY },
      legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(255,255,255,0.7)', bordercolor: 'rgba(249,200,212,0.4)', borderwidth: 1 },
    }), { responsive: true, displaylogo: false });
  }, [Plotly, regColX, regColY, activeDatasetIdx, regResult]);

  // ── Derived state (memoized to avoid recomputing on every render) ──────────

  const descStats = useMemo(() => {
    if (!activeDataset || !descCol) return null;
    const vals = activeDataset.columns[descCol];
    if (!vals) return null;
    try { return computeDescriptive(vals); } catch { return null; }
  }, [activeDataset, descCol]);

  const inferResult = useMemo(() => {
    if (!activeDataset || !inferCol1) return null;
    const vals1 = activeDataset.columns[inferCol1];
    if (!vals1 || vals1.length < 2) return null;
    const conf = parseFloat(confidenceLevel);
    const mu = parseFloat(mu0Input);
    try {
      if (inferTab === 'ci') return computeCI(vals1, isNaN(conf) ? 0.95 : conf);
      if (inferTab === 'one-t') return computeOneSampleT(vals1, isNaN(mu) ? 0 : mu);
      if (inferTab === 'two-t') {
        const ds2 = inferDs2Idx !== null ? datasets[inferDs2Idx] ?? activeDataset : activeDataset;
        const vals2 = ds2.columns[inferCol2];
        if (!vals2 || vals2.length < 2) return null;
        return computeTwoSampleT(vals1, vals2);
      }
    } catch { return null; }
    return null;
  }, [activeDataset, inferCol1, inferCol2, inferDs2Idx, datasets, inferTab, confidenceLevel, mu0Input]);

  const cn = parseInt(cnInput), cr = parseInt(crInput);
  const comboOk = Number.isInteger(cn) && Number.isInteger(cr) && cn >= 0 && cr >= 0 && cr <= cn;
  const comboResult = comboOk ? combination(cn, cr) : null;
  const permResult = comboOk ? permutation(cn, cr) : null;
  const needsXY = ['scatter', 'dot'].includes(chartType);

  const TABS = [
    { id: 'data', label: 'Data' },
    { id: 'summary', label: 'Descriptive' },
    { id: 'charts', label: 'Charts' },
    { id: 'inference', label: 'Inference' },
    { id: 'regression', label: 'Regression' },
    { id: 'combo', label: 'Combo / Perm' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Statistics - MathHelper</title>
        <meta name="description" content="Comprehensive statistics toolkit: CSV import, descriptive stats, charts, hypothesis tests, regression, and more." />
      </Head>

      <div className="page-header">
        <h1>Statistics <span>Toolkit</span></h1>
        <p>Import CSV data and perform descriptive statistics, visualizations, hypothesis tests, and regression analysis.</p>
      </div>

      <div className="tabs stats-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {t.id !== 'data' && t.id !== 'combo' && activeDataset && (
              <span style={{ marginLeft: '0.35em', fontSize: '0.7em', opacity: 0.7 }}>
                {activeDataset.name}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════
          DATA TAB
          ════════════════════════════════════════════════ */}
      {activeTab === 'data' && (
        <div>
          {/* Import section */}
          <div className="sakura-card mb-3">
            <h3 className="sakura-heading sakura-heading-sm mb-2">Import CSV Dataset</h3>
            <div className="sakura-info mb-2" style={{ marginTop: 0 }}>
              Only CSV files are accepted. Up to {MAX_ROWS} rows and {MAX_DATASETS} datasets. All imported columns must be numeric.
            </div>

            <div className="grid-2" style={{ gap: '1rem', alignItems: 'start' }}>
              {/* Left: file picker + name */}
              <div>
                <label className="sakura-label">CSV File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  style={{
                    display: 'block', width: '100%', marginBottom: '0.75rem',
                    fontSize: '0.88rem', color: 'var(--s-ink-soft)',
                  }}
                />

                {csvParsed && (
                  <>
                    <label className="sakura-label">Dataset Name</label>
                    <input
                      className="sakura-input mb-2"
                      value={datasetName}
                      onChange={e => setDatasetName(e.target.value)}
                      placeholder="e.g. exam_scores"
                    />

                    <label className="sakura-label">
                      Max columns to import
                      <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-body)', textTransform: 'none', marginLeft: '0.4rem', opacity: 0.7 }}>
                        (detected {csvParsed.headers.length} total · {csvParsed.totalRows} rows)
                      </span>
                    </label>
                    <input
                      className="sakura-input mb-2"
                      type="number"
                      min={1}
                      max={csvParsed.headers.length}
                      value={maxColsInput}
                      onChange={e => handleMaxColsChange(e.target.value)}
                      placeholder={String(csvParsed.headers.length)}
                    />
                  </>
                )}
              </div>

              {/* Right: column selector */}
              {csvParsed && (
                <div>
                  <label className="sakura-label">
                    Select columns to import&nbsp;
                    <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-body)', textTransform: 'none', opacity: 0.7 }}>
                      ({selectedCols.length} / {maxColsInput || csvParsed.headers.length} selected)
                    </span>
                  </label>
                  <div style={{
                    maxHeight: '180px', overflowY: 'auto',
                    border: '1px solid rgba(232,137,154,0.30)',
                    borderRadius: 'var(--r-md)', padding: '0.5rem',
                    background: 'rgba(255,255,255,0.6)',
                  }}>
                    {csvParsed.headers.map((h, i) => (
                      <label key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.25rem 0.5rem', cursor: 'pointer',
                        borderRadius: 'var(--r-sm)',
                        background: selectedCols.includes(i) ? 'rgba(249,200,212,0.25)' : undefined,
                        fontSize: '0.88rem',
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedCols.includes(i)}
                          onChange={() => toggleColumn(i)}
                        />
                        <span style={{ fontFamily: "'SF Mono','Fira Code',monospace", color: 'var(--s-ink)' }}>{h}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <InlineErr msg={importError} />
            {importWarnings.length > 0 && (
              <div className="sakura-warning" style={{ marginTop: '0.75rem' }}>
                {importWarnings.map((w, i) => <div key={i}>{w}</div>)}
              </div>
            )}

            {csvParsed && (
              <button
                className="sakura-btn sakura-btn-primary mt-2"
                onClick={handleImport}
                disabled={selectedCols.length === 0 || !datasetName.trim()}
                style={{ marginTop: '1rem' }}
              >
                Import Dataset
              </button>
            )}
          </div>

          {/* Dataset list */}
          {datasets.length > 0 && (
            <div className="sakura-card">
              <h3 className="sakura-heading sakura-heading-sm mb-2">
                Loaded Datasets ({datasets.length} / {MAX_DATASETS})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {datasets.map((ds, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '0.75rem', padding: '0.6rem 0.9rem',
                    borderRadius: 'var(--r-md)',
                    background: activeDatasetIdx === i ? 'rgba(249,200,212,0.30)' : 'rgba(255,255,255,0.5)',
                    border: activeDatasetIdx === i
                      ? '1.5px solid rgba(232,137,154,0.50)'
                      : '1px solid rgba(249,200,212,0.25)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                    onClick={() => setActiveDatasetIdx(i)}
                  >
                    <div>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--s-ink)' }}>
                        {ds.name}
                      </span>
                      <span style={{ marginLeft: '0.75rem', fontSize: '0.82rem', color: 'var(--s-ink-soft)' }}>
                        {ds.rowCount} rows · {ds.columnNames.join(', ')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      {activeDatasetIdx === i && (
                        <span className="sakura-badge sakura-badge-petal">active</span>
                      )}
                      <button
                        className="sakura-btn sakura-btn-ghost"
                        style={{ padding: '0.25em 0.7em', fontSize: '0.8rem' }}
                        onClick={e => { e.stopPropagation(); deleteDataset(i); }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--s-ink-soft)' }}>
                Click a dataset to make it active for analysis in other tabs.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          DESCRIPTIVE STATISTICS TAB
          ════════════════════════════════════════════════ */}
      {activeTab === 'summary' && (
        <div>
          {!activeDataset ? <NoData /> : (
            <>
              <div className="sakura-card mb-3">
                <DatasetSelect datasets={datasets} activeIdx={activeDatasetIdx} onChange={setActiveDatasetIdx} />
                <ColSelect label="Column" columns={activeDataset.columnNames} value={descCol} onChange={setDescCol} />
              </div>

              {descStats && (
                <div className="grid-2" style={{ gap: '1.25rem', alignItems: 'start' }}>
                  {/* Central tendency & spread */}
                  <div className="sakura-card" style={{ padding: '1.25rem 1.5rem' }}>
                    <h4 className="sakura-heading sakura-heading-sm mb-2">Summary — {descCol}</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <StatRow label="n (count)" value={descStats.n} />
                        <StatRow label="Mean" value={fmt(descStats.mean)} />
                        <StatRow label="Trimmed mean (10%)" value={descStats.trimmedMean != null ? fmt(descStats.trimmedMean) : 'n < 10'} />
                        <StatRow label="Median" value={fmt(descStats.median)} />
                        <StatRow label="Mode" value={descStats.mode != null ? fmtSci(descStats.mode) : '—'} />
                        <StatRow label="Std deviation" value={fmt(descStats.stdDev)} />
                        <StatRow label="Variance" value={fmt(descStats.variance)} />
                        <StatRow label="Range" value={fmt(descStats.range)} />
                        <StatRow label="Skewness" value={descStats.skewness != null ? fmt(descStats.skewness) : 'n < 3'} />
                        <StatRow label="Kurtosis" value={descStats.kurtosis != null ? fmt(descStats.kurtosis) : 'n < 4'} />
                      </tbody>
                    </table>
                  </div>

                  {/* Five-number summary */}
                  <div className="sakura-card" style={{ padding: '1.25rem 1.5rem' }}>
                    <h4 className="sakura-heading sakura-heading-sm mb-2">Five-Number Summary</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <StatRow label="Minimum" value={fmt(descStats.min)} />
                        <StatRow label="Q1 (25th pct.)" value={fmt(descStats.q1)} />
                        <StatRow label="Median (Q2)" value={fmt(descStats.median)} />
                        <StatRow label="Q3 (75th pct.)" value={fmt(descStats.q3)} />
                        <StatRow label="Maximum" value={fmt(descStats.max)} />
                        <StatRow label="IQR (Q3 − Q1)" value={fmt(descStats.iqr)} />
                      </tbody>
                    </table>

                    {/* Inline box strip */}
                    <div style={{ marginTop: '1.25rem' }}>
                      <label className="sakura-label" style={{ marginBottom: '0.5rem' }}>Box-strip preview</label>
                      <BoxStrip stats={descStats} />
                    </div>
                  </div>

                  {/* Multi-column summary */}
                  {activeDataset.columnNames.length > 1 && (
                    <div className="sakura-card" style={{ gridColumn: '1 / -1', padding: '1.25rem 1.5rem' }}>
                      <h4 className="sakura-heading sakura-heading-sm mb-2">All Columns Summary</h4>
                      <div style={{ overflowX: 'auto' }}>
                        <AllColsTable dataset={activeDataset} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          CHARTS TAB
          ════════════════════════════════════════════════ */}
      {activeTab === 'charts' && (
        <div>
          {!activeDataset ? <NoData /> : (
            <>
              <div className="sakura-card mb-3">
                <DatasetSelect datasets={datasets} activeIdx={activeDatasetIdx} onChange={setActiveDatasetIdx} />
                <div className="mb-2">
                  <label className="sakura-label">Chart Type</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {[
                      { id: 'histogram', label: 'Histogram' },
                      { id: 'box', label: 'Box Plot' },
                      { id: 'violin', label: 'Violin / Density' },
                      { id: 'dot', label: 'Dot Plot' },
                      { id: 'scatter', label: 'Scatter' },
                      { id: 'bar', label: 'Bar' },
                      { id: 'pie', label: 'Pie' },
                    ].map(ct => (
                      <button
                        key={ct.id}
                        className={`sakura-chip ${chartType === ct.id ? 'active' : ''}`}
                        onClick={() => setChartType(ct.id)}
                      >
                        {ct.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid-2" style={{ gap: '1rem' }}>
                  <ColSelect
                    label={needsXY ? 'X Column' : 'Column'}
                    columns={activeDataset.columnNames}
                    value={chartColX}
                    onChange={setChartColX}
                  />
                  {needsXY && (
                    <ColSelect
                      label="Y Column"
                      columns={activeDataset.columnNames}
                      value={chartColY}
                      onChange={setChartColY}
                    />
                  )}
                </div>
              </div>

              <div className="sakura-card">
                <div
                  ref={chartRef}
                  className="plot-container"
                  style={{ minHeight: '420px', width: '100%' }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          INFERENCE TAB
          ════════════════════════════════════════════════ */}
      {activeTab === 'inference' && (
        <div>
          {!activeDataset ? <NoData /> : (
            <>
              <div className="tabs" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
                {[
                  { id: 'ci', label: 'Confidence Interval' },
                  { id: 'one-t', label: 'One-Sample t-Test' },
                  { id: 'two-t', label: 'Two-Sample t-Test' },
                ].map(t => (
                  <button
                    key={t.id}
                    className={`tab ${inferTab === t.id ? 'active' : ''}`}
                    onClick={() => setInferTab(t.id)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="grid-2" style={{ gap: '1.25rem', alignItems: 'start' }}>
                {/* Controls */}
                <div className="sakura-card">
                  <DatasetSelect datasets={datasets} activeIdx={activeDatasetIdx} onChange={setActiveDatasetIdx} />
                  <ColSelect label="Column (Sample 1)" columns={activeDataset.columnNames} value={inferCol1} onChange={setInferCol1} />

                  {inferTab === 'ci' && (
                    <div className="mb-2">
                      <label className="sakura-label">Confidence Level (e.g. 0.95)</label>
                      <input
                        className="sakura-input"
                        type="number" min={0.5} max={0.999} step={0.01}
                        value={confidenceLevel}
                        onChange={e => setConfidenceLevel(e.target.value)}
                      />
                    </div>
                  )}

                  {inferTab === 'one-t' && (
                    <div className="mb-2">
                      <label className="sakura-label">Null Hypothesis Mean (μ₀)</label>
                      <input
                        className="sakura-input"
                        type="number" step="any"
                        value={mu0Input}
                        onChange={e => setMu0Input(e.target.value)}
                      />
                    </div>
                  )}

                  {inferTab === 'two-t' && (
                    <>
                      <DatasetSelect
                        datasets={datasets}
                        activeIdx={inferDs2Idx ?? activeDatasetIdx}
                        onChange={v => setInferDs2Idx(v)}
                        label="Dataset (Sample 2)"
                      />
                      <ColSelect
                        label="Column (Sample 2)"
                        columns={(inferDs2Idx !== null ? datasets[inferDs2Idx] : activeDataset)?.columnNames || []}
                        value={inferCol2}
                        onChange={setInferCol2}
                      />
                    </>
                  )}
                </div>

                {/* Results */}
                <div className="sakura-card" style={{ padding: '1.25rem 1.5rem' }}>
                  {!inferResult ? (
                    <div style={{ color: 'var(--s-ink-soft)', fontSize: '0.9rem' }}>
                      Select a column and configure the test to see results.
                    </div>
                  ) : (
                    <>
                      {inferTab === 'ci' && <CIResults r={inferResult} />}
                      {inferTab === 'one-t' && <OneTResults r={inferResult} />}
                      {inferTab === 'two-t' && <TwoTResults r={inferResult} />}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          REGRESSION TAB
          ════════════════════════════════════════════════ */}
      {activeTab === 'regression' && (
        <div>
          {!activeDataset ? <NoData /> : (
            <>
              <div className="grid-2" style={{ gap: '1.25rem', alignItems: 'start' }}>
                {/* Controls + results */}
                <div>
                  <div className="sakura-card mb-2">
                    <DatasetSelect datasets={datasets} activeIdx={activeDatasetIdx} onChange={setActiveDatasetIdx} />
                    <ColSelect label="X (predictor)" columns={activeDataset.columnNames} value={regColX} onChange={setRegColX} />
                    <ColSelect label="Y (response)" columns={activeDataset.columnNames} value={regColY} onChange={setRegColY} />
                    {regColX && regColY && regColX === regColY && (
                      <div className="sakura-warning">X and Y must be different columns.</div>
                    )}
                  </div>

                  {regResult && (
                    <div className="sakura-card" style={{ padding: '1.25rem 1.5rem' }}>
                      <h4 className="sakura-heading sakura-heading-sm mb-2">Regression Results</h4>
                      <RegResults r={regResult} xLabel={regColX} yLabel={regColY} />
                    </div>
                  )}
                </div>

                {/* Scatter + fit */}
                <div className="sakura-card">
                  <div
                    ref={regChartRef}
                    className="plot-container"
                    style={{ minHeight: '380px', width: '100%' }}
                  />
                  {!regResult && (
                    <p style={{ textAlign: 'center', color: 'var(--s-ink-soft)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                      Select X and Y columns to display the scatter plot with regression line.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          COMBINATION / PERMUTATION TAB
          ════════════════════════════════════════════════ */}
      {activeTab === 'combo' && (
        <div className="grid-2" style={{ gap: '1.25rem', maxWidth: '700px' }}>
          <div className="sakura-card">
            <h3 className="sakura-heading sakura-heading-sm mb-2">Combination &amp; Permutation</h3>
            <div className="mb-2">
              <label className="sakura-label">n (total items)</label>
              <input
                className="sakura-input"
                type="number" min={0} step={1}
                value={cnInput}
                onChange={e => setCnInput(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
            <div className="mb-3">
              <label className="sakura-label">r (items chosen)</label>
              <input
                className="sakura-input"
                type="number" min={0} step={1}
                value={crInput}
                onChange={e => setCrInput(e.target.value)}
                placeholder="e.g. 3"
              />
            </div>
            {cnInput !== '' && crInput !== '' && !comboOk && (
              <div className="sakura-error">
                {cn < 0 || cr < 0 ? 'n and r must be non-negative integers.' : 'r cannot be greater than n.'}
              </div>
            )}
          </div>

          <div className="sakura-card" style={{ padding: '1.5rem' }}>
            <h4 className="sakura-heading sakura-heading-sm mb-3">Results</h4>

            <div style={{ marginBottom: '1.25rem' }}>
              <div className="sakura-label">C(n, r) — Combinations</div>
              <div style={{
                fontFamily: "'SF Mono','Fira Code',monospace", fontSize: '1.6rem',
                color: 'var(--s-ink)', marginTop: '0.25rem',
              }}>
                {comboResult != null ? (
                  isFinite(comboResult) ? comboResult.toLocaleString() : '∞ (overflow)'
                ) : '—'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--s-ink-soft)', marginTop: '0.25rem' }}>
                C(n,r) = n! / (r!(n−r)!)
              </div>
            </div>

            <hr className="sakura-divider" />

            <div>
              <div className="sakura-label">P(n, r) — Permutations</div>
              <div style={{
                fontFamily: "'SF Mono','Fira Code',monospace", fontSize: '1.6rem',
                color: 'var(--s-ink)', marginTop: '0.25rem',
              }}>
                {permResult != null ? (
                  isFinite(permResult) ? permResult.toLocaleString() : '∞ (overflow)'
                ) : '—'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--s-ink-soft)', marginTop: '0.25rem' }}>
                P(n,r) = n! / (n−r)!
              </div>
            </div>

            {comboOk && comboResult != null && permResult != null && (
              <div className="sakura-info" style={{ marginTop: '1rem' }}>
                For n={cn} and r={cr}: there are&nbsp;
                <strong>{isFinite(comboResult) ? comboResult.toLocaleString() : '∞'}</strong>&nbsp;combinations
                and&nbsp;
                <strong>{isFinite(permResult) ? permResult.toLocaleString() : '∞'}</strong>&nbsp;permutations.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function BoxStrip({ stats }) {
  const { min, q1, median, q3, max } = stats;
  const range = max - min || 1;
  const pct = v => ((v - min) / range * 100).toFixed(2) + '%';

  return (
    <div style={{ position: 'relative', height: '40px', background: 'rgba(255,255,255,0.6)',
      border: '1px solid rgba(232,137,154,0.25)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
      {/* IQR box */}
      <div style={{
        position: 'absolute', top: '20%', height: '60%',
        left: pct(q1), width: pct(q3 - q1 + min),
        background: 'rgba(232,137,154,0.45)',
        border: '1.5px solid rgba(232,137,154,0.70)',
        borderRadius: '3px',
      }} />
      {/* Median line */}
      <div style={{
        position: 'absolute', top: '10%', height: '80%',
        left: pct(median), width: '2px',
        background: 'var(--s-petal-deep)',
      }} />
      {/* Whisker left */}
      <div style={{
        position: 'absolute', top: '48%', height: '4%',
        left: pct(min), width: pct(q1 - min + min),
        background: 'var(--s-ink-soft)',
      }} />
      {/* Whisker right */}
      <div style={{
        position: 'absolute', top: '48%', height: '4%',
        left: pct(q3), width: pct(max - q3 + min),
        background: 'var(--s-ink-soft)',
      }} />
      {/* Labels */}
      <div style={{ position: 'absolute', bottom: '-18px', left: pct(min),
        fontSize: '0.65rem', color: 'var(--s-ink-soft)', transform: 'translateX(-50%)' }}>
        {fmt(min, 2)}
      </div>
      <div style={{ position: 'absolute', bottom: '-18px', left: pct(max),
        fontSize: '0.65rem', color: 'var(--s-ink-soft)', transform: 'translateX(-50%)' }}>
        {fmt(max, 2)}
      </div>
    </div>
  );
}

function AllColsTable({ dataset }) {
  const cols = dataset.columnNames;
  const allStats = useMemo(
    () => cols.map(col => computeDescriptive(dataset.columns[col] || [])),
    [dataset]
  );
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
      <thead>
        <tr style={{ background: 'rgba(249,200,212,0.20)' }}>
          <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--s-ink-soft)', whiteSpace: 'nowrap' }}>Column</th>
          {['n', 'Mean', 'Std Dev', 'Min', 'Q1', 'Median', 'Q3', 'Max'].map(h => (
            <th key={h} style={{ padding: '0.4rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--s-ink-soft)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {cols.map((col, i) => {
          const s = allStats[i];
          if (!s) return null;
          return (
            <tr key={col} style={{ background: i % 2 === 0 ? undefined : 'rgba(249,200,212,0.08)' }}>
              <td style={{ padding: '0.38rem 0.75rem', fontFamily: "'SF Mono','Fira Code',monospace", color: 'var(--s-bark)', whiteSpace: 'nowrap' }}>{col}</td>
              {[s.n, fmt(s.mean), fmt(s.stdDev), fmt(s.min), fmt(s.q1), fmt(s.median), fmt(s.q3), fmt(s.max)].map((v, j) => (
                <td key={j} style={{ padding: '0.38rem 0.75rem', textAlign: 'right', fontFamily: "'SF Mono','Fira Code',monospace", color: 'var(--s-ink)' }}>{v}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CIResults({ r }) {
  const pct = (r.confidence * 100).toFixed(0);
  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <span className="sakura-badge sakura-badge-petal">{pct}% Confidence Interval</span>
      </div>
      <div style={{
        textAlign: 'center', padding: '1rem',
        background: 'rgba(249,200,212,0.15)', borderRadius: 'var(--r-md)',
        marginBottom: '1rem',
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--s-ink-soft)', marginBottom: '0.25rem' }}>Interval for μ</div>
        <div style={{ fontFamily: "'SF Mono','Fira Code',monospace", fontSize: '1.3rem', color: 'var(--s-ink)' }}>
          ({fmt(r.lower)}, {fmt(r.upper)})
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <StatRow label="Sample mean (x̄)" value={fmt(r.mean)} />
          <StatRow label="Std deviation" value={fmt(r.stdDev)} />
          <StatRow label="Std error (SE)" value={fmt(r.se)} />
          <StatRow label="Degrees of freedom" value={Math.round(r.df)} />
          <StatRow label={`t* (${pct}% CI)`} value={fmt(r.tCrit)} />
          <StatRow label="n" value={r.n} />
          <StatRow label="Lower bound" value={fmt(r.lower)} />
          <StatRow label="Upper bound" value={fmt(r.upper)} />
        </tbody>
      </table>
    </>
  );
}

function OneTResults({ r }) {
  const sig = r.pTwoTail < 0.05;
  return (
    <>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span className="sakura-badge sakura-badge-bark">One-Sample t-Test</span>
        <span className={`sakura-badge ${sig ? 'sakura-badge-petal' : 'sakura-badge-mist'}`}>
          {sig ? 'Significant (α=0.05)' : 'Not significant (α=0.05)'}
        </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <StatRow label="H₀: μ =" value={fmt(r.mu0, 2)} />
          <StatRow label="Sample mean (x̄)" value={fmt(r.mean)} />
          <StatRow label="Std deviation" value={fmt(r.stdDev)} />
          <StatRow label="Std error (SE)" value={fmt(r.se)} />
          <StatRow label="t-statistic" value={fmt(r.t)} />
          <StatRow label="Degrees of freedom" value={Math.round(r.df)} />
          <StatRow label="p-value (two-tailed)" value={fmtP(r.pTwoTail)} />
          <StatRow label="p-value (left-tail)" value={fmtP(r.pLeft)} />
          <StatRow label="p-value (right-tail)" value={fmtP(r.pRight)} />
          <StatRow label="n" value={r.n} />
        </tbody>
      </table>
    </>
  );
}

function TwoTResults({ r }) {
  const sig = r.pTwoTail < 0.05;
  return (
    <>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span className="sakura-badge sakura-badge-violet">Two-Sample t-Test (Welch)</span>
        <span className={`sakura-badge ${sig ? 'sakura-badge-petal' : 'sakura-badge-mist'}`}>
          {sig ? 'Significant (α=0.05)' : 'Not significant (α=0.05)'}
        </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <StatRow label="H₀: μ₁ = μ₂" value="" mono={false} />
          <StatRow label="Mean 1 (x̄₁)" value={fmt(r.mean1)} />
          <StatRow label="Mean 2 (x̄₂)" value={fmt(r.mean2)} />
          <StatRow label="Difference (x̄₁ − x̄₂)" value={fmt(r.mean1 - r.mean2)} />
          <StatRow label="Std Dev 1" value={fmt(r.stdDev1)} />
          <StatRow label="Std Dev 2" value={fmt(r.stdDev2)} />
          <StatRow label="Std error (SE)" value={fmt(r.se)} />
          <StatRow label="t-statistic" value={fmt(r.t)} />
          <StatRow label="Degrees of freedom" value={fmt(r.df, 2)} />
          <StatRow label="p-value (two-tailed)" value={fmtP(r.pTwoTail)} />
          <StatRow label="n₁" value={r.n1} />
          <StatRow label="n₂" value={r.n2} />
        </tbody>
      </table>
    </>
  );
}

function RegResults({ r, xLabel, yLabel }) {
  const slopeSign = r.slope >= 0 ? '+' : '';
  return (
    <>
      <div style={{
        background: 'rgba(249,200,212,0.15)', borderRadius: 'var(--r-md)',
        padding: '0.75rem 1rem', marginBottom: '1rem',
        fontFamily: "'SF Mono','Fira Code',monospace", fontSize: '0.92rem',
      }}>
        ŷ = {fmt(r.intercept)} {slopeSign}{fmt(r.slope)} · x
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <StatRow label="Intercept (b₀)" value={fmt(r.intercept)} />
          <StatRow label="Slope (b₁)" value={fmt(r.slope)} />
          <StatRow label="R² (coeff. determination)" value={fmt(r.r2)} />
          <StatRow label="r (correlation)" value={fmt(r.r)} />
          <StatRow label="Std error of estimate" value={fmt(r.se)} />
          <StatRow label="SE of slope" value={fmt(r.seSlope)} />
          <StatRow label="t-stat (slope)" value={fmt(r.tSlope)} />
          <StatRow label="p-value (slope)" value={fmtP(r.pSlope)} />
          <StatRow label="SE of intercept" value={fmt(r.seIntercept)} />
          <StatRow label="t-stat (intercept)" value={fmt(r.tIntercept)} />
          <StatRow label="p-value (intercept)" value={fmtP(r.pIntercept)} />
          <StatRow label="Degrees of freedom" value={r.df} />
          <StatRow label="n" value={r.n} />
        </tbody>
      </table>
    </>
  );
}
