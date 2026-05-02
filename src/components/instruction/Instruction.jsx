import React from "react";
import styles from "./instruction.module.css";

export const Instruction = () => {
  return (
    <div className={styles.box}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>NON-STATIONARITY DETECTION</h1>
          <p>This simulation demonstrates how adaptive filters can detect statistical changes in a signal.</p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 1: </span>Generate the signal. A non-stationary change (mean shift and variance change) is automatically injected at the midpoint.
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 2: </span>Choose the adaptive algorithm (LMS or RLS) and its parameters. 
            <ul>
              <li><b>LMS</b>: Simple update, slower adaptation to changes.</li>
              <li><b>RLS</b>: Recursive update, much faster adaptation to changes.</li>
            </ul>
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 3: </span>Click <b>"Apply Filter"</b> and observe the results:
            <ul>
              <li><b>Stationary region:</b> Error power is small and stable.</li>
              <li><b>Change-point:</b> Sudden spike in error power as weights become outdated.</li>
              <li><b>Adaptation:</b> Error power reduces as the filter learns the new statistics.</li>
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
