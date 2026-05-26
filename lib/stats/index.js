import * as ss from 'simple-statistics';

// ── T-distribution (regularized incomplete beta via continued fraction) ──

function logGamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) { y += 1; ser += c[j] / y; }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function betacf(a, b, x) {
  const MAXIT = 200, EPS = 3e-7, FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function ibeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const bt = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta);
  if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
  return 1 - bt * betacf(b, a, 1 - x) / b;
}

export function tCDF(t, df) {
  if (!isFinite(t) || df <= 0) return NaN;
  const x = df / (df + t * t);
  const p = 0.5 * ibeta(df / 2, 0.5, x);
  return t >= 0 ? 1 - p : p;
}

export function tQuantile(p, df) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  let lo = -1000, hi = 1000;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    tCDF(mid, df) < p ? (lo = mid) : (hi = mid);
  }
  return (lo + hi) / 2;
}

// ── CSV Parsing ───────────────────────────────────────────────────────────

export function parseCSVHeaders(text) {
  if (!text || !text.trim()) throw new Error('The file is empty.');
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');
  const raw = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const headers = raw.filter(Boolean);
  if (headers.length === 0) throw new Error('No column headers found in the first row.');
  return { headers, totalRows: lines.length - 1, rawLines: lines };
}

export function parseCSVWithColumns(rawLines, headers, selectedColIndices, maxRows = 500) {
  if (!selectedColIndices || selectedColIndices.length === 0) throw new Error('No columns selected for import.');
  const invalid = selectedColIndices.filter(i => i < 0 || i >= headers.length);
  if (invalid.length > 0) throw new Error(`Invalid column indices: ${invalid.join(', ')}`);

  const selectedHeaders = selectedColIndices.map(i => headers[i]);
  const data = {};
  selectedHeaders.forEach(h => { data[h] = []; });

  const warnings = [];
  const dataLines = rawLines.slice(1);

  if (dataLines.length > maxRows) {
    warnings.push(`File has ${dataLines.length} rows. Only the first ${maxRows} rows will be imported.`);
  }

  const rowsToProcess = dataLines.slice(0, maxRows);
  let skipped = 0;

  for (let i = 0; i < rowsToProcess.length; i++) {
    const line = rowsToProcess[i].trim();
    if (!line) continue;
    const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    let rowValid = true;
    const rowValues = {};

    for (const colIdx of selectedColIndices) {
      const header = headers[colIdx];
      const rawVal = values[colIdx];
      if (rawVal === undefined || rawVal === '') {
        warnings.push(`Row ${i + 2}: missing value in "${header}" — row skipped.`);
        rowValid = false;
        break;
      }
      const num = parseFloat(rawVal);
      if (isNaN(num)) {
        warnings.push(`Row ${i + 2}: non-numeric value "${rawVal}" in "${header}" — row skipped.`);
        rowValid = false;
        break;
      }
      rowValues[header] = num;
    }

    if (rowValid) {
      selectedHeaders.forEach(h => { data[h].push(rowValues[h]); });
    } else {
      skipped++;
    }
  }

  const imported = (data[selectedHeaders[0]] || []).length;
  if (imported === 0) throw new Error('No valid numeric rows found. Check that selected columns contain numeric data.');
  if (skipped > 0) warnings.push(`${skipped} row(s) skipped due to missing or non-numeric values.`);

  return { columns: data, columnNames: selectedHeaders, rowCount: imported, warnings };
}

// ── Descriptive Statistics ─────────────────────────────────────────────────

export function computeDescriptive(values) {
  if (!values || values.length === 0) return null;
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);

  let trimmedMean = null;
  if (n >= 10) {
    const k = Math.floor(0.1 * n);
    trimmedMean = ss.mean(sorted.slice(k, n - k));
  }

  let modeVal = null;
  try { modeVal = ss.mode(values); } catch {}

  const q1 = ss.quantile(sorted, 0.25);
  const q3 = ss.quantile(sorted, 0.75);

  let skewness = null, kurtosis = null;
  try { if (n > 2) skewness = ss.sampleSkewness(values); } catch {}
  try { if (n > 3) kurtosis = ss.sampleKurtosis(values); } catch {}

  return {
    n,
    mean: ss.mean(values),
    trimmedMean,
    median: ss.median(values),
    mode: modeVal,
    variance: n > 1 ? ss.variance(values) : 0,
    stdDev: n > 1 ? ss.standardDeviation(values) : 0,
    min: ss.min(values),
    max: ss.max(values),
    range: ss.max(values) - ss.min(values),
    q1,
    q3,
    iqr: q3 - q1,
    skewness,
    kurtosis,
  };
}

// ── Confidence Interval ───────────────────────────────────────────────────

export function computeCI(values, confidence = 0.95) {
  const s = computeDescriptive(values);
  if (!s || s.n < 2) return null;
  const alpha = 1 - confidence;
  const tCrit = tQuantile(1 - alpha / 2, s.n - 1);
  const se = s.stdDev / Math.sqrt(s.n);
  return {
    mean: s.mean, lower: s.mean - tCrit * se, upper: s.mean + tCrit * se,
    se, tCrit, df: s.n - 1, confidence, n: s.n, stdDev: s.stdDev,
  };
}

// ── T-Tests ───────────────────────────────────────────────────────────────

export function computeOneSampleT(values, mu0 = 0) {
  const s = computeDescriptive(values);
  if (!s || s.n < 2) return null;
  const se = s.stdDev / Math.sqrt(s.n);
  const t = (s.mean - mu0) / se;
  const df = s.n - 1;
  return {
    t, df,
    pTwoTail: 2 * (1 - tCDF(Math.abs(t), df)),
    pLeft: tCDF(t, df),
    pRight: 1 - tCDF(t, df),
    mean: s.mean, se, mu0, n: s.n, stdDev: s.stdDev,
  };
}

export function computeTwoSampleT(values1, values2) {
  const s1 = computeDescriptive(values1);
  const s2 = computeDescriptive(values2);
  if (!s1 || !s2 || s1.n < 2 || s2.n < 2) return null;
  const v1 = s1.variance / s1.n, v2 = s2.variance / s2.n;
  const se = Math.sqrt(v1 + v2);
  const t = (s1.mean - s2.mean) / se;
  const df = Math.pow(v1 + v2, 2) / (Math.pow(v1, 2) / (s1.n - 1) + Math.pow(v2, 2) / (s2.n - 1));
  return {
    t, df,
    pTwoTail: 2 * (1 - tCDF(Math.abs(t), df)),
    mean1: s1.mean, mean2: s2.mean,
    se, n1: s1.n, n2: s2.n,
    stdDev1: s1.stdDev, stdDev2: s2.stdDev,
  };
}

// ── Linear Regression ─────────────────────────────────────────────────────

export function computeRegression(xValues, yValues) {
  if (!xValues || !yValues || xValues.length !== yValues.length || xValues.length < 3) return null;
  const n = xValues.length;
  const pairs = xValues.map((x, i) => [x, yValues[i]]);
  const line = ss.linearRegression(pairs);
  const lineFunc = ss.linearRegressionLine(line);
  const r2 = ss.rSquared(pairs, lineFunc);
  const r = Math.sqrt(r2) * (line.m >= 0 ? 1 : -1);

  const yPred = xValues.map(x => lineFunc(x));
  const residuals = yValues.map((y, i) => y - yPred[i]);
  const sse = residuals.reduce((acc, v) => acc + v * v, 0);
  const mse = sse / (n - 2);
  const se = Math.sqrt(mse);

  const xMean = ss.mean(xValues);
  const sxx = xValues.reduce((acc, x) => acc + Math.pow(x - xMean, 2), 0);
  const seSlope = Math.sqrt(mse / sxx);
  const seIntercept = Math.sqrt(mse * (1 / n + (xMean * xMean) / sxx));
  const tSlope = line.m / seSlope;
  const tIntercept = line.b / seIntercept;
  const pSlope = 2 * (1 - tCDF(Math.abs(tSlope), n - 2));
  const pIntercept = 2 * (1 - tCDF(Math.abs(tIntercept), n - 2));
  const correlation = ss.sampleCorrelation(xValues, yValues);

  return {
    slope: line.m, intercept: line.b, r2, r,
    se, seSlope, seIntercept,
    tSlope, tIntercept, pSlope, pIntercept,
    df: n - 2, n, yPred, residuals, correlation,
  };
}

// ── Combination and Permutation ───────────────────────────────────────────

export function combination(n, r) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) return NaN;
  if (r === 0 || r === n) return 1;
  const k = Math.min(r, n - r);
  let result = 1;
  for (let i = 0; i < k; i++) result = result * (n - i) / (i + 1);
  return Math.round(result);
}

export function permutation(n, r) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) return NaN;
  let result = 1;
  for (let i = n - r + 1; i <= n; i++) result *= i;
  return result;
}