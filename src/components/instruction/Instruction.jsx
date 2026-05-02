import React from "react";
import styles from "./instruction.module.css";

export const Instruction = () => {
  return (
    <div className={styles.box}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>INSTRUCTIONS</h1>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 1: </span>Select an <b>ECG Dataset</b> from the dropdown
            menu (or keep the default synthetic signal). Adjust the{" "}
            <b>Duration</b> and <b>Sampling Rate</b> inputs as needed. Click the{" "}
            <b>"Generate ECG Signal"</b> button (or change sampling/duration) to
            create the signal.
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 2: </span>Select noise options if available (Baseline
            Wander, Powerline, EMG). Use the controls to add noise and observe
            the corrupted ECG in the <b>Noisy</b> plot.
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 3: </span>Choose the adaptive algorithm in the Left
            Panel:
            <ul>
              <li>
                <b>NLMS</b> — set <i>Filter Order (M)</i> and <i>Step Size (μ)</i>.
                Allowed input ranges in the UI: <b>M</b> = 1–256 (recommended 16–64, default 32), <b>μ</b> = 0.01–0.2 (default 0.1). Larger μ → faster convergence but higher instability risk.
              </li>
               <li>
                <b>LMS</b> — simple Least-Mean-Squares adaptive FIR. Set <i>Filter Order (M)</i> and <i>Step Size (μ)</i>. Use smaller μ values for stability (LMS typically converges slower than NLMS). Allowed ranges: <b>M</b> = 1–256, <b>μ</b> small (UI allows very small values).
              </li>
              <li>
                <b>RLS</b> — set <i>Filter Order (M)</i>, <i>Forgetting Factor (λ)</i>
                and <i>Regularization (δ)</i>. Allowed ranges: <b>M</b> = 1–256 (recommended 16–64), <b>λ</b> = 0.90–0.999999 (default 0.99), <b>δ</b> = 1e-12–1 (default 0.01). For ECG use choose λ close to 1 (longer memory) and δ small to regularize P.
              </li>
            </ul>
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 4: </span>Run the adaptive filter by applying the chosen
            algorithm (UI updates automatically). Observe:
            <ul>
              <li>The <b>Filtered</b> plot — how closely it follows the clean
              waveform.</li>
              <li>Top-panel metrics (MSE) — lower is better.</li>
            </ul>
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 5: </span>Tune parameters and compare:
            <ul>
              <li>For NLMS: reduce μ for stability or increase M for more
              modeling power.</li>
              <li>For RLS: adjust λ for memory length and δ to stabilize P.</li>
              <li>Switch between NLMS and RLS to compare convergence speed and
              final MSE.</li>
            </ul>
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 6 (Optional): </span>If available, enable diagnostics
            (error curve or weight visualization) to inspect convergence and
            filter behavior over time.
          </p>
        </div>
      </div>
    </div>
  );
};
