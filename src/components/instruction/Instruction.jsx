import React from "react";
import styles from "./instruction.module.css";

export const Instruction = () => {
  return (
    <div className={styles.box}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>LAB EXPERIMENT: NON-STATIONARITY DETECTION</h1>
          <p>
            This experiment demonstrates how adaptive filters detect and adapt to sudden statistical changes in a signal.
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 1: SIGNAL GENERATION</span>
            Select between <b>Real ECG Datasets</b> or a <b>Synthetic AR Process</b>. Adjust the duration and click <b>"Generate Signal"</b>. The synthetic AR process is ideal for studying pure mathematical shifts.
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 2: CORRUPTING THE SIGNAL</span>
            Toggle <b>Baseline Wander</b>, <b>Powerline Noise</b>, or <b>EMG Noise</b>. Click <b>"Add Noise"</b> to observe the corrupted signal in the <b>Noisy ECG</b> plot. This simulates real-world sensor observations.
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 3: ALGORITHM SELECTION</span>
            Choose your adaptive strategy:
            <ul>
              <li>
                <b>LMS</b> — Simple and stable. Requires tuning <i>Step Size (μ)</i>. Large μ detects faster but is noisier.
              </li>
              <li>
                <b>RLS</b> — Fast convergence but computationally heavy. Tune <i>Forgetting Factor (λ)</i> to adjust the algorithm's memory.
              </li>
            </ul>
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 4: RUN PREDICTOR</span>
            Click <b>"Run Predictor"</b>. The filter will "learn" the signal model. Observe the <b>Error Power</b> graph — it should stay below the red threshold θ once the filter converges.
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 5: INJECT NON-STATIONARITY</span>
            The core of the lab. Use the sliders to set a <b>Change-point (n*)</b> and choose an injection type (e.g., <b>AR Parameter Shift</b> or <b>Variance Jump</b>). Click <b>"Inject Change-point"</b>.
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 6: ANALYSIS & DETECTION</span>
            Observe the results of the injection:
            <ul>
              <li><b>Error Power Spike:</b> A massive surge at the change-point indicates a detection. Check the <b>Detection Lag</b> metric.</li>
              <li><b>Weight Trajectory:</b> See how the filter weights <i>w(n)</i> drift to new values as they adapt to the change.</li>
              <li><b>Saturation Effect:</b> Notice the brief flatline on the signal plots — this simulates physical sensor fault during a system shift.</li>
            </ul>
          </p>
        </div>
      </div>
    </div>
  );
};
