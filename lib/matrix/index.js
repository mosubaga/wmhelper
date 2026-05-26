import { Matrix, determinant, inverse, EigenvalueDecomposition, LuDecomposition } from 'ml-matrix';

/**
 * Creates a Matrix from a 2D array of values.
 * @param {number[][]} values - 2D array of numbers
 * @returns {Matrix}
 */
export function createMatrix(values) {
  return new Matrix(values);
}

/**
 * Computes the determinant of a square matrix.
 * @param {number[][]} values - 2D array of numbers
 * @returns {{ result: number, error: string|null }}
 */
export function computeDeterminant(values) {
  try {
    const matrix = new Matrix(values);
    const det = determinant(matrix);
    return { result: Number(det.toFixed(3)), error: null };
  } catch (err) {
    return { result: null, error: 'Failed to compute determinant' };
  }
}

/**
 * Computes the inverse of a square matrix.
 * @param {number[][]} values - 2D array of numbers
 * @returns {{ result: number[][]|null, error: string|null, warning: string|null }}
 */
export function computeInverse(values) {
  try {
    const matrix = new Matrix(values);
    const det = determinant(matrix);

    // Check for singular or nearly singular matrix
    const warning = Math.abs(det) < 1e-10
      ? 'Matrix is singular or nearly singular. Inverse is not reliable.'
      : null;

    if (Math.abs(det) < 1e-15) {
      return { result: null, error: 'Matrix is singular and cannot be inverted', warning: null };
    }

    const inv = inverse(matrix);
    const formatted = formatMatrix(inv.to2DArray());
    return { result: formatted, error: null, warning };
  } catch (err) {
    return { result: null, error: 'Failed to compute inverse', warning: null };
  }
}

/**
 * Computes eigenvalues and eigenvectors of a square matrix.
 * @param {number[][]} values - 2D array of numbers
 * @returns {{ eigenvalues: string[], eigenvectors: number[][]|null, error: string|null }}
 */
export function computeEigen(values) {
  try {
    const matrix = new Matrix(values);
    const eig = new EigenvalueDecomposition(matrix);

    const realEigenvalues = eig.realEigenvalues;
    const imaginaryEigenvalues = eig.imaginaryEigenvalues;

    // Format eigenvalues as strings (handling complex numbers)
    const eigenvalues = realEigenvalues.map((real, i) => {
      const imag = imaginaryEigenvalues[i];
      return formatComplex(real, imag);
    });

    // Get eigenvectors
    const eigenvectorMatrix = eig.eigenvectorMatrix;
    const eigenvectors = formatMatrix(eigenvectorMatrix.to2DArray());

    return { eigenvalues, eigenvectors, error: null };
  } catch (err) {
    return { eigenvalues: null, eigenvectors: null, error: 'Failed to compute eigenvalues' };
  }
}

/**
 * Computes LU decomposition of a square matrix.
 * @param {number[][]} values - 2D array of numbers
 * @returns {{ L: number[][], U: number[][], error: string|null }}
 */
export function computeLU(values) {
  try {
    const matrix = new Matrix(values);
    const lu = new LuDecomposition(matrix);

    const L = formatMatrix(lu.lowerTriangularMatrix.to2DArray());
    const U = formatMatrix(lu.upperTriangularMatrix.to2DArray());

    return { L, U, error: null };
  } catch (err) {
    return { L: null, U: null, error: 'Failed to compute LU decomposition' };
  }
}

/**
 * Formats a complex number as a string.
 * @param {number} real - Real part
 * @param {number} imag - Imaginary part
 * @returns {string}
 */
function formatComplex(real, imag) {
  const r = Number(real.toFixed(3));
  const i = Number(imag.toFixed(3));

  if (Math.abs(i) < 1e-10) {
    return String(r);
  }

  if (Math.abs(r) < 1e-10) {
    if (Math.abs(i - 1) < 1e-10) return 'i';
    if (Math.abs(i + 1) < 1e-10) return '-i';
    return `${i}i`;
  }

  const sign = i >= 0 ? '+' : '-';
  const absI = Math.abs(i);
  const iStr = Math.abs(absI - 1) < 1e-10 ? '' : String(absI);

  return `${r} ${sign} ${iStr}i`;
}

/**
 * Formats a 2D array of numbers to 3 decimal places.
 * @param {number[][]} matrix - 2D array of numbers
 * @returns {number[][]}
 */
function formatMatrix(matrix) {
  return matrix.map(row =>
    row.map(val => Number(val.toFixed(3)))
  );
}

/**
 * Validates that all cells in the matrix are valid numbers.
 * @param {any[][]} values - 2D array of values
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateMatrix(values) {
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values[i].length; j++) {
      const val = values[i][j];
      if (val === '' || val === null || val === undefined) {
        return { valid: false, error: `Empty cell at row ${i + 1}, column ${j + 1}` };
      }
      const num = Number(val);
      if (isNaN(num)) {
        return { valid: false, error: `Invalid number at row ${i + 1}, column ${j + 1}` };
      }
    }
  }
  return { valid: true, error: null };
}

/**
 * Converts a 2D array of strings/numbers to numbers.
 * @param {any[][]} values - 2D array of values
 * @returns {number[][]}
 */
export function toNumericMatrix(values) {
  return values.map(row => row.map(val => Number(val)));
}
