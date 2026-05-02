function clampNumber(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function calculateMSE(reference, filtered) {
  if (!Array.isArray(reference) || !Array.isArray(filtered)) return 0;
  const n = Math.min(reference.length, filtered.length);
  if (n === 0) return 0;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const e = reference[i] - filtered[i];
    acc += e * e;
  }
  return acc / n;
}

/**
 * Normalized LMS adaptive FIR.
 *
 * In this app:
 * - `noisy` is treated as the filter input x[n]
 * - `reference` is treated as the desired signal d[n]
 * - output is y[n] = w^T xVec, which should approximate `reference`
 */
export function filterSignalNLMS(noisy, reference, options = {}) {
  const { filterOrder, stepSize, epsilon = 1e-8, returnDiagnostics = false } = options;
  if (!Array.isArray(noisy) || noisy.length === 0) return returnDiagnostics ? { yFiltered: [], diagnostics: {} } : [];
  if (!Array.isArray(reference) || reference.length === 0) return returnDiagnostics ? { yFiltered: [], diagnostics: {} } : [];

  const N = Math.min(noisy.length, reference.length);
  const M = Math.max(1, Math.min(256, Math.floor(filterOrder ?? 1)));
  const mu = clampNumber(stepSize ?? 0.1, 0.01, 0.2);
  const eps = Math.max(1e-12, epsilon);

  const w = new Array(M).fill(0);
  const yFiltered = new Array(N).fill(0);

  // diagnostics
  const weightsHistory = returnDiagnostics ? [] : null;
  const errorHistory = returnDiagnostics ? new Array(N).fill(0) : null;
  const powerHistory = returnDiagnostics ? new Array(N).fill(0) : null;

  for (let n = 0; n < N; n++) {
    // xVec = [x[n], x[n-1], ..., x[n-M+1]]
    let power = eps;
    const xVec = new Array(M);
    for (let k = 0; k < M; k++) {
      const idx = n - k;
      const v = idx >= 0 ? noisy[idx] : 0;
      xVec[k] = v;
      power += v * v;
    }

    // y[n] = w^T xVec
    let y = 0;
    for (let k = 0; k < M; k++) y += w[k] * xVec[k];
    yFiltered[n] = y;

    const d = reference[n];
    const e = d - y;

    if (returnDiagnostics) {
      errorHistory[n] = e;
      powerHistory[n] = power;
      weightsHistory.push(w.slice());
    }

    // w = w + (mu * e / power) * xVec
    const gain = (mu * e) / power;
    for (let k = 0; k < M; k++) w[k] += gain * xVec[k];
  }

  if (returnDiagnostics) {
    return {
      yFiltered,
      diagnostics: {
        weightsHistory,
        errorHistory,
        powerHistory,
      },
    };
  }

  return yFiltered;
}

export function filterSignalLMS(x, options = {}) {
  const { filterOrder = 32, stepSize = 0.01, windowLength = 50, thresholdK = 3 } = options;
  if (!Array.isArray(x) || x.length === 0) return { y: [], e: [], e2: [], Pe: [], detectionFlags: [] };

  const N = x.length;
  const M = Math.max(1, Math.min(256, Math.floor(filterOrder)));
  const mu = clampNumber(stepSize, 1e-8, 1);
  const L = Math.max(1, windowLength);

  const w = new Array(M).fill(0);
  const y = new Array(N).fill(0);
  const e = new Array(N).fill(0);
  const e2 = new Array(N).fill(0);

  // --- LMS ADAPTATION LOOP ---
  for (let n = 0; n < N; n++) {
    const u = new Array(M);
    for (let k = 0; k < M; k++) {
      const idx = n - k;
      u[k] = idx >= 0 ? x[idx] : 0;
    }

    let yn = 0;
    for (let k = 0; k < M; k++) yn += w[k] * u[k];
    y[n] = yn;

    const dn = x[n];
    const en = dn - yn;
    e[n] = en;
    e2[n] = en * en;

    const gain = mu * en;
    for (let k = 0; k < M; k++) w[k] += gain * u[k];
  }

  // --- NON-STATIONARITY DETECTION ---
  const Pe = new Array(N).fill(0);
  for (let n = 0; n < N; n++) {
    let sum = 0;
    const start = Math.max(0, n - L + 1);
    for (let i = start; i <= n; i++) sum += e2[i];
    Pe[n] = sum / (n - start + 1);
  }

  const meanPe = Pe.reduce((a, b) => a + b, 0) / N;
  const stdPe = Math.sqrt(Pe.reduce((a, b) => a + Math.pow(b - meanPe, 2), 0) / N);
  const detectionFlags = Pe.map(p => p > (meanPe + thresholdK * stdPe));

  return { y, e, e2, Pe, detectionFlags };
}

export function filterSignalRLS(x, options = {}) {
  const { filterOrder = 32, forgettingFactor = 0.99, regularization = 0.01, windowLength = 50, thresholdK = 3 } = options;
  if (!Array.isArray(x) || x.length === 0) return { y: [], e: [], e2: [], Pe: [], detectionFlags: [] };

  const N = x.length;
  const M = Math.max(1, Math.min(256, Math.floor(filterOrder)));
  const lambda = clampNumber(forgettingFactor, 0.9, 0.999999);
  const delta = Math.max(1e-12, regularization);
  const L = Math.max(1, windowLength);

  const P = new Array(M);
  for (let i = 0; i < M; i++) {
    P[i] = new Array(M).fill(0);
    P[i][i] = 1 / delta;
  }

  const w = new Array(M).fill(0);
  const y = new Array(N).fill(0);
  const e = new Array(N).fill(0);
  const e2 = new Array(N).fill(0);

  // --- RLS ADAPTATION LOOP ---
  for (let n = 0; n < N; n++) {
    const u = new Array(M);
    for (let k = 0; k < M; k++) {
      const idx = n - k;
      u[k] = idx >= 0 ? x[idx] : 0;
    }

    const z = new Array(M).fill(0);
    for (let i = 0; i < M; i++) {
      let acc = 0;
      for (let j = 0; j < M; j++) acc += P[i][j] * u[j];
      z[i] = acc;
    }

    let uTz = 0;
    for (let k = 0; k < M; k++) uTz += u[k] * z[k];
    const denom = lambda + uTz;

    let yn = 0;
    for (let k = 0; k < M; k++) yn += w[k] * u[k];
    y[n] = yn;

    const dn = x[n];
    const en = dn - yn;
    e[n] = en;
    e2[n] = en * en;

    const kVec = new Array(M);
    for (let i = 0; i < M; i++) kVec[i] = z[i] / denom;

    for (let i = 0; i < M; i++) w[i] += kVec[i] * en;

    for (let i = 0; i < M; i++) {
      for (let j = 0; j < M; j++) {
        P[i][j] = (P[i][j] - kVec[i] * z[j]) / lambda;
      }
    }
  }

  // --- NON-STATIONARITY DETECTION ---
  const Pe = new Array(N).fill(0);
  for (let n = 0; n < N; n++) {
    let sum = 0;
    const start = Math.max(0, n - L + 1);
    for (let i = start; i <= n; i++) sum += e2[i];
    Pe[n] = sum / (n - start + 1);
  }

  const meanPe = Pe.reduce((a, b) => a + b, 0) / N;
  const stdPe = Math.sqrt(Pe.reduce((a, b) => a + Math.pow(b - meanPe, 2), 0) / N);
  const detectionFlags = Pe.map(p => p > (meanPe + thresholdK * stdPe));

  return { y, e, e2, Pe, detectionFlags };
}


