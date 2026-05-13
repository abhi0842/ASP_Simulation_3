import { useContext, useState } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./debugPanel.module.css";

export const DebugPanel = () => {
  const { rawSamples, currentSignal, noisySamples, filteredSamples, lmsResult, rlsResult } = useContext(SimulationContext);
  const [showDebug, setShowDebug] = useState(false);

  const getStatus = () => {
    const checks = {
      "Raw Samples Loaded": rawSamples.length > 0,
      "Current Signal Ready": currentSignal.length > 0,
      "Noisy Samples Available": noisySamples.length > 0,
      "Filtered Samples Available": filteredSamples.length > 0,
      "LMS Results Available": lmsResult !== null,
      "RLS Results Available": rlsResult !== null,
    };
    return checks;
  };

  const status = getStatus();
  const allGood = Object.values(status).every(v => v === true);

  if (!showDebug) {
    return (
      <button 
        className={styles.debugButton}
        onClick={() => setShowDebug(true)}
        title="Click to see debug info"
      >
        🔧 Debug
      </button>
    );
  }

  return (
    <div className={styles.debugPanel}>
      <div className={styles.header}>
        <h3>🔍 Debug Panel</h3>
        <button onClick={() => setShowDebug(false)} className={styles.closeBtn}>✕</button>
      </div>

      <div className={styles.statusGrid}>
        {Object.entries(status).map(([key, value]) => (
          <div key={key} className={`${styles.statusItem} ${value ? styles.ok : styles.missing}`}>
            <span className={styles.icon}>{value ? "✓" : "✗"}</span>
            <span className={styles.label}>{key}</span>
          </div>
        ))}
      </div>

      <div className={styles.stats}>
        <h4>Signal Statistics:</h4>
        {rawSamples.length > 0 && (
          <p>
            <strong>Raw Samples:</strong> {rawSamples.length} samples ({(rawSamples.length / 500).toFixed(2)}s at 500Hz)
          </p>
        )}
        {currentSignal.length > 0 && (
          <p>
            <strong>Current Signal:</strong> {currentSignal.length} amplitude values
          </p>
        )}
        {noisySamples.length > 0 && (
          <p>
            <strong>Noisy Samples:</strong> {noisySamples.length} samples
          </p>
        )}
        {filteredSamples.length > 0 && (
          <p>
            <strong>Filtered Samples:</strong> {filteredSamples.length} samples
          </p>
        )}
      </div>

      <div className={styles.message}>
        {allGood ? (
          <p style={{ color: '#27ae60' }}>✓ All systems operational!</p>
        ) : (
          <p style={{ color: '#e74c3c' }}>⚠ Some data is missing. Load signals first.</p>
        )}
      </div>

      <div className={styles.hint}>
        <p><strong>Troubleshooting:</strong></p>
        <ul>
          <li>Check browser console (F12) for detailed errors</li>
          <li>Ensure CSV files are in <code>/public/</code> folder</li>
          <li>Try "Load All ECG Files" button first</li>
          <li>Check network tab for failed file downloads</li>
        </ul>
      </div>
    </div>
  );
};
