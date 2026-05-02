import { computePSD } from '../src/utils/psd.js';

function generateSine(freq, fs, duration, noiseAmp = 0) {
  const N = Math.floor(fs * duration);
  const signal = new Array(N);
  for (let n = 0; n < N; n++) {
    const t = n / fs;
    signal[n] = Math.sin(2 * Math.PI * freq * t) + (Math.random() * 2 - 1) * noiseAmp;
  }
  return signal;
}

(async () => {
  const fs = 500;
  const f0 = 10; // Hz
  const duration = 2.0; // seconds
  const sig = generateSine(f0, fs, duration, 0.02);

  const { freqs, psd } = computePSD(sig, fs);

  console.log('Computed PSD length:', psd.length, 'freqs length:', freqs.length);
  console.log('First 10 freqs:', freqs.slice(0, 10));
  console.log('First 10 PSD (dB):', psd.slice(0, 10));

  // Find top peaks (largest PSD dB values)
  const peaks = psd
    .map((v, i) => ({ i, v, f: freqs[i] }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 6);

  console.log('\nTop PSD peaks (dB):');
  peaks.forEach(p => console.log(`${p.f.toFixed(2)} Hz : ${p.v.toFixed(2)} dB`));
})();
