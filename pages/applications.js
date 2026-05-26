import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';

export default function Applications() {
  const [activeTab, setActiveTab] = useState('loan');

  return (
    <>
      <Head>
        <title>Real-World Applications - MathHelper</title>
        <meta name="description" content="Loan calculator and investment growth calculator." />
      </Head>

      <div className="page-header">
        <h1>Real-World <span>Applications</span></h1>
        <p>Practical financial calculations powered by simple arithmetic.</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'loan' ? 'active' : ''}`}
          onClick={() => setActiveTab('loan')}
        >
          Loan Calculator
        </button>
        <button
          className={`tab ${activeTab === 'investment' ? 'active' : ''}`}
          onClick={() => setActiveTab('investment')}
        >
          Investment Growth
        </button>
        <button
          className={`tab ${activeTab === 'unit' ? 'active' : ''}`}
          onClick={() => setActiveTab('unit')}
        >
          Unit Converter
        </button>
      </div>

      {activeTab === 'loan' && <LoanCalculator />}
      {activeTab === 'investment' && <InvestmentCalculator />}
      {activeTab === 'unit' && <UnitConverter />}
    </>
  );
}

function LoanCalculator() {
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(5);
  const [years, setYears] = useState(30);
  const plotRef = useRef(null);
  const [Plotly, setPlotly] = useState(null);

  useEffect(() => {
    import('plotly.js-dist-min').then((module) => {
      setPlotly(module.default);
    });

    const plotElement = plotRef.current;
    return () => {
      if (plotElement) {
        import('plotly.js-dist-min').then((m) => m.default.purge(plotElement));
      }
    };
  }, []);

  const result = useMemo(() => {
    if (principal <= 0 || rate <= 0 || years <= 0) {
      return null;
    }

    const monthlyRate = rate / 100 / 12;
    const months = years * 12;
    const monthlyPayment = principal * monthlyRate * Math.pow(1 + monthlyRate, months)
      / (Math.pow(1 + monthlyRate, months) - 1);
    const totalPaid = monthlyPayment * months;
    const totalInterest = totalPaid - principal;
    const balances = [];
    let balance = principal;

    for (let month = 0; month <= months; month++) {
      balances.push(balance);
      if (month < months) {
        const principalPayment = monthlyPayment - balance * monthlyRate;
        balance -= principalPayment;
      }
    }

    return {
      monthlyPayment: monthlyPayment.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      totalInterest: totalInterest.toFixed(2),
      balances,
    };
  }, [principal, rate, years]);

  useEffect(() => {
    if (!Plotly || !plotRef.current || !result) return;

    const trace = {
      x: result.balances.map((_, index) => index),
      y: result.balances,
      type: 'scatter',
      mode: 'lines',
      fill: 'tozeroy',
      fillcolor: 'rgba(249,200,212,0.3)',
      line: { color: '#E8899A', width: 2 },
      name: 'Remaining Balance',
    };

    Plotly.react(
      plotRef.current,
      [trace],
      {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(255,255,255,0.5)',
        font: { family: 'Noto Sans JP, sans-serif', color: '#3D2B35' },
        margin: { t: 30, r: 30, b: 50, l: 70 },
        xaxis: { title: 'Month', gridcolor: 'rgba(232,137,154,0.2)' },
        yaxis: { title: 'Balance ($)', gridcolor: 'rgba(187,163,216,0.2)' },
      },
      { responsive: true }
    );
  }, [Plotly, result]);

  return (
    <div className="grid-2">
      <div className="sakura-card">
        <div className="mb-3">
          <label className="sakura-label">Principal ($)</label>
          <input
            type="number"
            className="sakura-input"
            value={principal}
            onChange={(e) => setPrincipal(parseFloat(e.target.value) || 0)}
            min="0"
          />
        </div>

        <div className="mb-3">
          <label className="sakura-label">Annual Interest Rate (%)</label>
          <input
            type="number"
            className="sakura-input"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
            min="0"
            step="0.1"
          />
        </div>

        <div className="mb-3">
          <label className="sakura-label">Loan Term (years)</label>
          <input
            type="number"
            className="sakura-input"
            value={years}
            onChange={(e) => setYears(parseInt(e.target.value) || 0)}
            min="1"
          />
        </div>

        {result && (
          <div style={{ marginTop: '1.5rem' }}>
            <hr className="sakura-divider" />
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label className="sakura-label">Monthly Payment</label>
                <div className="result-display" style={{ fontSize: '1.5rem', minHeight: 'auto', padding: '1rem' }}>
                  ${result.monthlyPayment}
                </div>
              </div>

              <div className="grid-2" style={{ gap: '1rem' }}>
                <div>
                  <label className="sakura-label">Total Paid</label>
                  <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>${result.totalPaid}</div>
                </div>
                <div>
                  <label className="sakura-label">Total Interest</label>
                  <div style={{ fontSize: '1.1rem', fontWeight: 500, color: '#c44' }}>${result.totalInterest}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="sakura-card">
        <h3 className="sakura-heading sakura-heading-sm mb-2">Amortization Chart</h3>
        <div className="plot-container" ref={plotRef}>
          {!result && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              color: 'var(--s-ink-soft)',
            }}>
              Enter loan details to see the amortization chart.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InvestmentCalculator() {
  const [initial, setInitial] = useState(10000);
  const [annualContribution, setAnnualContribution] = useState(5000);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(20);
  const plotRef = useRef(null);
  const [Plotly, setPlotly] = useState(null);

  useEffect(() => {
    import('plotly.js-dist-min').then((module) => {
      setPlotly(module.default);
    });

    const plotElement = plotRef.current;
    return () => {
      if (plotElement) {
        import('plotly.js-dist-min').then((m) => m.default.purge(plotElement));
      }
    };
  }, []);

  const result = useMemo(() => {
    if (initial < 0 || annualContribution < 0 || rate <= -100 || years <= 0) return null;

    const annualRate = rate / 100;
    const values = [initial];
    let balance = initial;

    for (let year = 1; year <= years; year++) {
      balance = balance * (1 + annualRate) + annualContribution;
      values.push(balance);
    }

    const totalContributions = initial + annualContribution * years;
    const totalGain = values[years] - totalContributions;

    return {
      finalValue: values[years].toFixed(2),
      totalContributions: totalContributions.toFixed(2),
      totalGain: totalGain.toFixed(2),
      values,
    };
  }, [initial, annualContribution, rate, years]);

  const formattedGain = result
    ? `${Number(result.totalGain) >= 0 ? '+' : '-'}$${Math.abs(Number(result.totalGain)).toFixed(2)}`
    : null;

  useEffect(() => {
    if (!Plotly || !plotRef.current || !result) return;

    const trace = {
      x: result.values.map((_, index) => index),
      y: result.values,
      type: 'scatter',
      mode: 'lines',
      fill: 'tozeroy',
      fillcolor: 'rgba(187,163,216,0.3)',
      line: { color: '#8B6BB1', width: 2 },
      name: 'Portfolio Value',
    };

    Plotly.react(
      plotRef.current,
      [trace],
      {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(255,255,255,0.5)',
        font: { family: 'Noto Sans JP, sans-serif', color: '#3D2B35' },
        margin: { t: 30, r: 30, b: 50, l: 70 },
        xaxis: { title: 'Year', gridcolor: 'rgba(232,137,154,0.2)' },
        yaxis: { title: 'Value ($)', gridcolor: 'rgba(187,163,216,0.2)' },
      },
      { responsive: true }
    );
  }, [Plotly, result]);

  return (
    <div className="grid-2">
      <div className="sakura-card">
        <div className="mb-3">
          <label className="sakura-label">Initial Investment ($)</label>
          <input
            type="number"
            className="sakura-input"
            value={initial}
            onChange={(e) => setInitial(parseFloat(e.target.value) || 0)}
            min="0"
          />
        </div>

        <div className="mb-3">
          <label className="sakura-label">Annual Contribution ($)</label>
          <input
            type="number"
            className="sakura-input"
            value={annualContribution}
            onChange={(e) => setAnnualContribution(parseFloat(e.target.value) || 0)}
            min="0"
          />
        </div>

        <div className="mb-3">
          <label className="sakura-label">Annual Return Rate (%)</label>
          <input
            type="number"
            className="sakura-input"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>

        <div className="mb-3">
          <label className="sakura-label">Time Horizon (years)</label>
          <input
            type="number"
            className="sakura-input"
            value={years}
            onChange={(e) => setYears(parseInt(e.target.value) || 0)}
            min="1"
          />
        </div>

        {result && (
          <div style={{ marginTop: '1.5rem' }}>
            <hr className="sakura-divider" />
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label className="sakura-label">Final Value</label>
                <div className="result-display" style={{ fontSize: '1.5rem', minHeight: 'auto', padding: '1rem' }}>
                  ${result.finalValue}
                </div>
              </div>

              <div className="grid-2" style={{ gap: '1rem' }}>
                <div>
                  <label className="sakura-label">Total Contributions</label>
                  <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>${result.totalContributions}</div>
                </div>
                <div>
                  <label className="sakura-label">Investment Growth</label>
                  <div style={{ fontSize: '1.1rem', fontWeight: 500, color: '#5a9f68' }}>{formattedGain}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="sakura-card">
        <h3 className="sakura-heading sakura-heading-sm mb-2">Growth Curve</h3>
        <div className="plot-container" ref={plotRef}>
          {!result && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              color: 'var(--s-ink-soft)',
            }}>
              Enter investment details to see the growth curve.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConverterCard({ label1, label2, toSecond, toFirst, formula, step = '0.1' }) {
  const [firstValue, setFirstValue] = useState('');
  const [secondValue, setSecondValue] = useState('');

  const updateFirst = (value) => {
    setFirstValue(value);
    const numberValue = parseFloat(value);
    setSecondValue(value === '' || isNaN(numberValue) ? '' : String(parseFloat(toSecond(numberValue).toFixed(6))));
  };

  const updateSecond = (value) => {
    setSecondValue(value);
    const numberValue = parseFloat(value);
    setFirstValue(value === '' || isNaN(numberValue) ? '' : String(parseFloat(toFirst(numberValue).toFixed(6))));
  };

  return (
    <div>
      <div className="mb-3">
        <label className="sakura-label">{label1}</label>
        <input
          type="number"
          className="sakura-input"
          value={firstValue}
          onChange={(e) => updateFirst(e.target.value)}
          placeholder={`Enter ${label1}`}
          step={step}
        />
      </div>

      <div style={{ textAlign: 'center', fontSize: '1.5rem', color: 'var(--s-ink-soft)', marginBottom: '1rem' }}>
        ⇅
      </div>

      <div className="mb-3">
        <label className="sakura-label">{label2}</label>
        <input
          type="number"
          className="sakura-input"
          value={secondValue}
          onChange={(e) => updateSecond(e.target.value)}
          placeholder={`Enter ${label2}`}
          step={step}
        />
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--s-ink-soft)' }}>
        {formula}
      </div>
    </div>
  );
}

function UnitConverter() {
  const converters = [
    {
      title: 'Temperature',
      label1: 'Celsius (°C)',
      label2: 'Fahrenheit (°F)',
      toSecond: (value) => value * 9 / 5 + 32,
      toFirst: (value) => (value - 32) * 5 / 9,
      formula: '°C = (°F - 32) x 5/9  |  °F = °C x 9/5 + 32',
    },
    {
      title: 'Volume',
      label1: 'Gallons (gal)',
      label2: 'Liters (L)',
      toSecond: (value) => value * 3.785411784,
      toFirst: (value) => value / 3.785411784,
      formula: '1 gal = 3.785411784 L',
    },
    {
      title: 'Distance',
      label1: 'Miles (mi)',
      label2: 'Kilometers (km)',
      toSecond: (value) => value * 1.609344,
      toFirst: (value) => value / 1.609344,
      formula: '1 mi = 1.609344 km',
    },
    {
      title: 'Mass',
      label1: 'Pounds (lb)',
      label2: 'Kilograms (kg)',
      toSecond: (value) => value * 0.45359237,
      toFirst: (value) => value / 0.45359237,
      formula: '1 lb = 0.45359237 kg',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
      {converters.map((converter) => (
        <div key={converter.title} className="sakura-card">
          <h3 className="sakura-heading sakura-heading-sm mb-2">{converter.title}</h3>
          <ConverterCard
            label1={converter.label1}
            label2={converter.label2}
            toSecond={converter.toSecond}
            toFirst={converter.toFirst}
            formula={converter.formula}
          />
        </div>
      ))}
    </div>
  );
}
