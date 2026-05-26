import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import katex from 'katex';

export default function LaTeXPreview() {
  const [input, setInput] = useState('');
  const [renderedBlocks, setRenderedBlocks] = useState([]);

  // Parse and render LaTeX
  useEffect(() => {
    if (!input.trim()) {
      setRenderedBlocks([]);
      return;
    }

    const blocks = extractMathBlocks(input);
    const rendered = blocks.map((block, idx) => {
      try {
        const html = katex.renderToString(block.content, {
          displayMode: block.display,
          throwOnError: true,
          strict: false
        });
        return { type: 'success', html, original: block.original };
      } catch (err) {
        return { type: 'error', error: err.message, original: block.original };
      }
    });

    setRenderedBlocks(rendered);
  }, [input]);

  // Handle file upload
  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setInput(content);
      }
    };
    reader.readAsText(file);
  }, []);

  return (
    <>
      <Head>
        <title>LaTeX Math Preview - MathHelper</title>
        <meta name="description" content="Render LaTeX math equations with KaTeX." />
      </Head>

      <div className="page-header">
        <h1>LaTeX <span>Preview</span></h1>
        <p>Paste LaTeX or upload a .tex file to preview math equations.</p>
      </div>

      <div className="sakura-info mb-3">
        Only math environments are rendered. Document structure, custom packages, and non-math commands are not supported.
      </div>

      <div className="grid-2">
        <div className="sakura-card">
          <div className="mb-3">
            <label className="sakura-label">LaTeX Input</label>
            <textarea
              className="sakura-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Enter LaTeX math here...

Examples:
$E = mc^2$

$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$

\\begin{equation}
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
\\end{equation}

\\begin{align}
a &= b + c \\\\
d &= e + f
\\end{align}`}
              style={{ minHeight: '300px', fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: '0.85rem' }}
            />
          </div>

          <div className="flex gap-1 items-center">
            <label className="sakura-btn sakura-btn-ghost" style={{ cursor: 'pointer' }}>
              Upload .tex file
              <input
                type="file"
                accept=".tex,.txt"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
            <button
              className="sakura-btn sakura-btn-ghost"
              onClick={() => setInput('')}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="sakura-card">
          <label className="sakura-label">Rendered Output</label>
          <div className="latex-output">
            {renderedBlocks.length === 0 ? (
              <p style={{ color: 'var(--s-ink-soft)', textAlign: 'center', padding: '2rem' }}>
                Enter LaTeX math to see rendered output.
              </p>
            ) : (
              renderedBlocks.map((block, idx) => (
                <div key={idx} style={{ marginBottom: '1rem' }}>
                  {block.type === 'success' ? (
                    <div dangerouslySetInnerHTML={{ __html: block.html }} />
                  ) : (
                    <div className="latex-error">
                      <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Error rendering:</div>
                      <div style={{ fontFamily: 'monospace', marginBottom: '0.5rem' }}>{block.original}</div>
                      <div style={{ color: '#8b0000' }}>{block.error}</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="sakura-card mt-3">
        <h3 className="sakura-heading sakura-heading-sm mb-2">Supported Environments</h3>
        <div className="flex gap-1 flex-wrap">
          <span className="sakura-badge sakura-badge-petal">$...$</span>
          <span className="sakura-badge sakura-badge-petal">$$...$$</span>
          <span className="sakura-badge sakura-badge-violet">\begin{'{'}equation{'}'}</span>
          <span className="sakura-badge sakura-badge-violet">\begin{'{'}align{'}'}</span>
          <span className="sakura-badge sakura-badge-bark">\begin{'{'}matrix{'}'}</span>
          <span className="sakura-badge sakura-badge-bark">\begin{'{'}pmatrix{'}'}</span>
          <span className="sakura-badge sakura-badge-bark">\begin{'{'}bmatrix{'}'}</span>
        </div>
      </div>
    </>
  );
}

/**
 * Extract math blocks from LaTeX input.
 * Detects inline ($...$), display ($$...$$), and environment blocks.
 */
function extractMathBlocks(input) {
  const blocks = [];

  // Patterns to match
  const patterns = [
    // Display math: $$...$$
    { regex: /\$\$([^$]+)\$\$/g, display: true },
    // Inline math: $...$
    { regex: /\$([^$\n]+)\$/g, display: false },
    // \begin{equation}...\end{equation}
    { regex: /\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, display: true },
    // \begin{align}...\end{align}
    { regex: /\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, display: true, env: 'aligned' },
    // \begin{matrix}...\end{matrix}
    { regex: /\\begin\{(matrix|pmatrix|bmatrix|vmatrix)\}([\s\S]*?)\\end\{\1\}/g, display: true, keepEnv: true },
  ];

  // Track positions to avoid duplicates
  const usedRanges = [];

  const isOverlapping = (start, end) => {
    return usedRanges.some(([s, e]) => !(end <= s || start >= e));
  };

  const addRange = (start, end) => {
    usedRanges.push([start, end]);
  };

  // Process display math first ($$...$$)
  let match;
  const displayRegex = /\$\$([\s\S]*?)\$\$/g;
  while ((match = displayRegex.exec(input)) !== null) {
    if (!isOverlapping(match.index, match.index + match[0].length)) {
      addRange(match.index, match.index + match[0].length);
      blocks.push({
        content: match[1].trim(),
        display: true,
        original: match[0],
        index: match.index
      });
    }
  }

  // Process equation environments
  const eqRegex = /\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g;
  while ((match = eqRegex.exec(input)) !== null) {
    if (!isOverlapping(match.index, match.index + match[0].length)) {
      addRange(match.index, match.index + match[0].length);
      blocks.push({
        content: match[1].trim(),
        display: true,
        original: match[0],
        index: match.index
      });
    }
  }

  // Process align environments
  const alignRegex = /\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g;
  while ((match = alignRegex.exec(input)) !== null) {
    if (!isOverlapping(match.index, match.index + match[0].length)) {
      addRange(match.index, match.index + match[0].length);
      // Wrap in aligned environment for KaTeX
      blocks.push({
        content: `\\begin{aligned}${match[1]}\\end{aligned}`,
        display: true,
        original: match[0],
        index: match.index
      });
    }
  }

  // Process matrix environments
  const matrixRegex = /\\begin\{(matrix|pmatrix|bmatrix|vmatrix)\}([\s\S]*?)\\end\{\1\}/g;
  while ((match = matrixRegex.exec(input)) !== null) {
    if (!isOverlapping(match.index, match.index + match[0].length)) {
      addRange(match.index, match.index + match[0].length);
      blocks.push({
        content: match[0],
        display: true,
        original: match[0],
        index: match.index
      });
    }
  }

  // Process inline math last ($...$)
  const inlineRegex = /\$([^$\n]+)\$/g;
  while ((match = inlineRegex.exec(input)) !== null) {
    if (!isOverlapping(match.index, match.index + match[0].length)) {
      addRange(match.index, match.index + match[0].length);
      blocks.push({
        content: match[1].trim(),
        display: false,
        original: match[0],
        index: match.index
      });
    }
  }

  // Sort by position in input
  blocks.sort((a, b) => a.index - b.index);

  return blocks;
}
