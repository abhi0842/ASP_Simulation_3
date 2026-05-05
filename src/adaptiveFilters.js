export function runLMS(signal, M, mu, L, K) {
  const N = signal.length;
  const w = new Float64Array(M).fill(0);
  const errors = new Float64Array(N);
  const Pe = new Float64Array(N);
  const weightsHistory = []; // sampled every 5 steps

  for (let n = M; n < N - 1; n++) {
    // input vector u(n) = [x(n), x(n-1), ..., x(n-M+1)]
    let y = 0;
    for (let k = 0; k < M; k++) y += w[k] * signal[n - k];
    const e = signal[n + 1] - y; // predict next sample
    errors[n] = e;
    for (let k = 0; k < M; k++) w[k] += mu * e * signal[n - k];
    if (n % 5 === 0) weightsHistory.push({ n, w: Array.from(w) });
  }

  // sliding window error power
  for (let n = L; n < N; n++) {
    let sum = 0;
    for (let i = n - L; i < n; i++) sum += errors[i] * errors[i];
    Pe[n] = sum / L;
  }

  // threshold from first 100 samples
  let mean = 0, std = 0;
  for (let i = 0; i < 100; i++) mean += Pe[L + i] || 0;
  mean /= 100;
  for (let i = 0; i < 100; i++) std += ((Pe[L + i] || 0) - mean) ** 2;
  std = Math.sqrt(std / 100);
  const theta = mean + K * std;

  let detectedAt = -1;
  for (let n = L + 100; n < N; n++) {
    if (Pe[n] > theta) { detectedAt = n; break; }
  }

  return { errors: Array.from(errors), Pe: Array.from(Pe), weightsHistory, theta, detectedAt };
}

export function runRLS(signal, M, lambda, delta, L, K) {
  const N = signal.length;
  const w = new Float64Array(M).fill(0);
  // P = (1/delta) * I
  const P = Array.from({ length: M }, (_, i) =>
    Array.from({ length: M }, (_, j) => (i === j ? 1 / delta : 0))
  );
  const errors = new Float64Array(N);
  const Pe = new Float64Array(N);
  const traceP = new Float64Array(N);
  const weightsHistory = [];

  for (let n = M; n < N - 1; n++) {
    const u = Array.from({ length: M }, (_, k) => signal[n - k]);
    // a priori error
    let xi = signal[n + 1];
    for (let k = 0; k < M; k++) xi -= w[k] * u[k];
    errors[n] = xi;

    // gain vector k = (lambda^-1 * P * u) / (1 + lambda^-1 * u^T * P * u)
    const Pu = u.map((_, i) => P[i].reduce((s, p, j) => s + p * u[j], 0));
    const denom = 1 + (1 / lambda) * u.reduce((s, ui, i) => s + ui * Pu[i], 0);
    const gain = Pu.map(v => v / (lambda * denom));

    // update weights
    for (let k = 0; k < M; k++) w[k] += gain[k] * xi;

    // update P: P = (1/lambda)*(P - gain * u^T * P)
    for (let i = 0; i < M; i++)
      for (let j = 0; j < M; j++)
        P[i][j] = (P[i][j] - gain[i] * Pu[j]) / lambda;

    traceP[n] = P.reduce((s, row, i) => s + row[i], 0);
    if (n % 5 === 0) weightsHistory.push({ n, w: Array.from(w) });
  }

  // sliding window Pe
  for (let n = L; n < N; n++) {
    let sum = 0;
    for (let i = n - L; i < n; i++) sum += errors[i] * errors[i];
    Pe[n] = sum / L;
  }

  let mean = 0, std = 0;
  for (let i = 0; i < 100; i++) mean += Pe[L + i] || 0;
  mean /= 100;
  for (let i = 0; i < 100; i++) std += ((Pe[L + i] || 0) - mean) ** 2;
  std = Math.sqrt(std / 100);
  const theta = mean + K * std;

  let detectedAt = -1;
  for (let n = L + 100; n < N; n++) {
    if (Pe[n] > theta) { detectedAt = n; break; }
  }

  const peakTrace = Array.from(traceP).reduce(
    (best, v, i) => (v > best.val ? { val: v, idx: i } : best), { val: 0, idx: 0 }
  );

  return { errors: Array.from(errors), Pe: Array.from(Pe), traceP: Array.from(traceP), weightsHistory, theta, detectedAt, peakTrace };
}

// Simple deterministic pseudo-random generator to keep injection consistent
function deterministicRandom(n) {
  const x = Math.sin(n) * 10000;
  return (x - Math.floor(x)) * 2 - 1; // Returns value between -1 and 1
}

export function injectChangePoint(originalSignal, changePoint, type, wanderAmp, noiseStd, fs) {
  const N = originalSignal.length;
  const sig = [...originalSignal];

  if (type === 'ar' || type === 'all') {
    // shift AR structure in segment 2 by adding correlated perturbation
    const ar2 = [1.5, -0.8, 0.3]; 
    for (let n = changePoint + 3; n < N; n++) {
      // Use deterministic random based on index n
      let v = noiseStd * 10 * deterministicRandom(n); 
      for (let k = 0; k < 3; k++) v += ar2[k] * (sig[n - 1 - k] - originalSignal[n - 1 - k]);
      sig[n] += 1.2 * v; 
    }
  }
  if (type === 'wander' || type === 'all') {
    const wanderFs = fs || 500;
    for (let n = changePoint; n < N; n++)
      sig[n] += wanderAmp * 6 * Math.sin(2 * Math.PI * 0.3 * (n - changePoint) / wanderFs);
  }
  if (type === 'variance' || type === 'all') {
    for (let n = changePoint; n < N; n++)
      sig[n] += noiseStd * 12 * deterministicRandom(n + N); // Offset index for different noise pattern
  }
  return sig;
}
