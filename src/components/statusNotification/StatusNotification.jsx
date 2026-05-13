import { useContext, useEffect, useState } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./statusNotification.module.css";

export const StatusNotification = () => {
  const { rawSamples, currentSignal } = useContext(SimulationContext);
  const [message, setMessage] = useState(null);
  const [type, setType] = useState("info"); // 'success', 'error', 'warning', 'info'

  useEffect(() => {
    if (rawSamples.length > 0 && currentSignal.length > 0) {
      setMessage(
        `✓ ECG Signal loaded: ${rawSamples.length} samples (${(rawSamples.length / 500).toFixed(1)}s at 500Hz)`
      );
      setType("success");

      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        setMessage(null);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [rawSamples, currentSignal]);

  if (!message) {
    return null;
  }

  return (
    <div className={`${styles.notification} ${styles[type]}`}>
      <span className={styles.content}>{message}</span>
      <button
        className={styles.closeBtn}
        onClick={() => setMessage(null)}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
};
