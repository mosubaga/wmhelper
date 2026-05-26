import { create, all } from 'mathjs';

// Create a mathjs instance with all functions
const math = create(all);

/**
 * Preprocesses an expression to support ln and log[base](arg) syntax.
 * - ln(x) → log(x) (mathjs natural log)
 * - log[base](arg) → log(arg, base)
 */
export function preprocessExpression(expr) {
  let result = expr.replace(/\bln\s*\(/g, 'log(');

  const logBaseRe = /\blog\[([^\]]+)\]\s*\(/g;
  let match;
  while ((match = logBaseRe.exec(result)) !== null) {
    const base = match[1];
    const startIdx = match.index;
    const openParenIdx = match.index + match[0].length - 1;

    let depth = 1;
    let closeIdx = openParenIdx + 1;
    while (closeIdx < result.length && depth > 0) {
      if (result[closeIdx] === '(') depth++;
      else if (result[closeIdx] === ')') depth--;
      closeIdx++;
    }
    closeIdx--;

    const arg = result.substring(openParenIdx + 1, closeIdx);
    const replacement = `log(${arg}, ${base})`;
    result = result.substring(0, startIdx) + replacement + result.substring(closeIdx + 1);
    logBaseRe.lastIndex = startIdx + replacement.length;
  }

  return result;
}

/**
 * Evaluates a mathematical expression numerically.
 * @param {string} expression - The math expression to evaluate
 * @returns {{ result: number|string, error: string|null }}
 */
export function evaluateExpression(expression) {
  if (!expression || expression.trim() === '') {
    return { result: null, error: 'Please enter an expression' };
  }

  try {
    const result = math.evaluate(preprocessExpression(expression));

    // Handle different result types
    if (typeof result === 'function') {
      return { result: null, error: 'Invalid expression' };
    }

    if (result === undefined || result === null) {
      return { result: null, error: 'Invalid expression' };
    }

    // Format the result
    const formatted = formatResult(result);
    return { result: formatted, error: null };
  } catch (err) {
    return { result: null, error: 'Invalid expression' };
  }
}

/**
 * Compiles an expression string once and returns a reusable evaluator function.
 * Avoids re-parsing on every data point — critical for 2D/3D plot performance.
 * @param {string} expression - The function expression
 * @returns {(scope: object) => number|null}
 */
export function createEvaluator(expression) {
  try {
    const compiled = math.compile(preprocessExpression(expression));
    return (scope) => {
      try {
        const result = compiled.evaluate(scope);
        if (typeof result === 'number' && isFinite(result)) return result;
        return null;
      } catch {
        return null;
      }
    };
  } catch {
    return () => null;
  }
}

/**
 * Evaluates a function expression for a given x value.
 * For plotting loops, prefer createEvaluator() to compile once.
 * @param {string} expression - The function expression (e.g., "x^2 + 1")
 * @param {number} x - The x value
 * @returns {number|null}
 */
export function evaluateAt(expression, x) {
  return createEvaluator(expression)({ x });
}

/**
 * Evaluates a function expression for given x and y values.
 * For plotting loops, prefer createEvaluator() to compile once.
 * @param {string} expression - The function expression (e.g., "sin(x) * cos(y)")
 * @param {number} x - The x value
 * @param {number} y - The y value
 * @returns {number|null}
 */
export function evaluateAt3D(expression, x, y) {
  return createEvaluator(expression)({ x, y });
}

/**
 * Formats a numeric result for display.
 * @param {number} value - The number to format
 * @returns {string}
 */
export function formatResult(value) {
  if (typeof value !== 'number') {
    return String(value);
  }

  // Check if it's effectively an integer
  if (Number.isInteger(value)) {
    return String(value);
  }

  // Round to 10 significant figures
  const formatted = Number(value.toPrecision(10));

  // Remove trailing zeros after decimal point
  return String(formatted);
}

/**
 * Generates an array of x values for plotting.
 * @param {number} start - Start of range
 * @param {number} end - End of range
 * @param {number} points - Number of points
 * @returns {number[]}
 */
export function generateRange(start, end, points) {
  const step = (end - start) / (points - 1);
  const values = [];
  for (let i = 0; i < points; i++) {
    values.push(start + i * step);
  }
  return values;
}

/**
 * Parses a function string, removing "y =" or "z =" prefix if present.
 * @param {string} funcStr - The function string
 * @param {string} prefix - The prefix to remove (e.g., "y", "z")
 * @returns {string}
 */
export function parseFunction(funcStr, prefix = 'y') {
  const trimmed = funcStr.trim();
  const regex = new RegExp(`^${prefix}\\s*=\\s*`, 'i');
  return trimmed.replace(regex, '');
}
