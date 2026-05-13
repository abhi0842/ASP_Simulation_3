/**
 * Utility functions for parsing ECG CSV files
 */

/**
 * Parse ECG data from raw values with normalization
 * @param {number[]} rawData - Raw ECG values from CSV
 * @returns {number[]} - Normalized ECG signal in millivolts
 */
export function normalizeECGData(rawData) {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    console.warn("Invalid ECG data");
    return [];
  }

  // Filter out NaN and infinity values
  const validData = rawData.filter(v => typeof v === 'number' && isFinite(v));

  if (validData.length === 0) {
    console.error("No valid numeric data in ECG file");
    return [];
  }

  // Find min/max for normalization
  const min = Math.min(...validData);
  const max = Math.max(...validData);
  const range = max - min;

  // If range is very large (likely in microvolts), scale down to millivolts
  // Typical ECG ranges: 0-10mV or -5 to +5mV
  if (range > 500) {
    // Assume data is in microvolts or arbitrary units
    return validData.map(v => {
      // Normalize to 0-1 range first
      const normalized = (v - min) / range;
      // Then scale to -2.5 to +2.5 mV (typical ECG range)
      return normalized * 5 - 2.5;
    });
  }

  // If range is reasonable, just remove offset
  if (range > 0) {
    return validData.map(v => v - min - range / 2);
  }

  return validData;
}

/**
 * Convert normalized ECG data to sample objects with time values
 * @param {number[]} data - ECG amplitude values
 * @param {number} fs - Sampling frequency (Hz)
 * @returns {Array} - Array of {x: time, y: amplitude} objects
 */
export function createTimeSeriesSamples(data, fs = 500) {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  return data.map((y, i) => ({
    x: i / fs,  // Time in seconds
    y: y        // Amplitude in mV
  }));
}

/**
 * Parse CSV content and extract ECG signal
 * @param {Array} csvRows - Raw CSV rows from Papa.parse
 * @returns {number[]} - Extracted ECG values
 */
export function extractECGFromCSV(csvRows) {
  if (!Array.isArray(csvRows)) {
    return [];
  }

  // Flatten and extract numeric values
  const data = csvRows
    .flat()
    .filter(v => typeof v === 'number' && !isNaN(v))
    .map(v => parseFloat(v));

  return data;
}

/**
 * Resample ECG signal to different sampling rate
 * @param {Array} samples - Sample objects with {x, y}
 * @param {number} fromFs - Original sampling frequency
 * @param {number} toFs - Target sampling frequency
 * @returns {Array} - Resampled samples
 */
export function resampleECG(samples, fromFs, toFs) {
  if (fromFs <= toFs) {
    return samples; // No downsampling needed
  }

  const step = Math.floor(fromFs / toFs);
  const resampled = [];

  for (let i = 0; i < samples.length; i += step) {
    resampled.push(samples[i]);
  }

  return resampled;
}

/**
 * Validate ECG signal characteristics
 * @param {Array} samples - Sample objects with {x, y}
 * @returns {Object} - Validation report
 */
export function validateECGSignal(samples) {
  const report = {
    isValid: true,
    issues: [],
    stats: {}
  };

  if (!Array.isArray(samples) || samples.length === 0) {
    report.isValid = false;
    report.issues.push("Empty signal");
    return report;
  }

  const amplitudes = samples.map(s => s.y);
  const min = Math.min(...amplitudes);
  const max = Math.max(...amplitudes);
  const mean = amplitudes.reduce((a, b) => a + b) / amplitudes.length;
  const variance = amplitudes.reduce((a, b) => a + Math.pow(b - mean, 2)) / amplitudes.length;

  report.stats = {
    samples: samples.length,
    duration: samples[samples.length - 1].x,
    minAmplitude: min,
    maxAmplitude: max,
    mean: mean,
    std: Math.sqrt(variance)
  };

  // ECG should have reasonable amplitude range
  if (Math.abs(max - min) < 0.1) {
    report.issues.push("Signal amplitude range too small");
  }

  // Check for constant signal
  if (variance < 0.0001) {
    report.issues.push("Signal appears to be constant (no variation)");
  }

  if (report.issues.length > 0) {
    report.isValid = false;
  }

  return report;
}
