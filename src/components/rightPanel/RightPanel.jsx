import { useContext, useState } from "react";
import { SimulationContext } from "../../context/SimulationContext.jsx";
import styles from "./rightPanel.module.css";
import Swal from "sweetalert2";

export const RightPanel = () => {
  const {
    time, setTime,
    rawSamples,
    config, setConfig,
    step, markAction, steps,
    guideActive,
    changePoint, setChangePoint,
    injectionType, setInjectionType,
    wanderAmp, setWanderAmp,
    noiseStd, setNoiseStd,
    handleInject,
    handleRestore,
    handleRunLMS, handleRunRLS,
    setGenerateECG,
    noise, setNoise,
    setApplyNoiseTrigger,
    csvFileName, setCsvFileName,
    useSynthetic, setUseSynthetic,
  } = useContext(SimulationContext);

  const currentStep = steps[step];
  const isHighlighted = (id) => guideActive && currentStep?.highlight === id;
  const isFaded = (id) => guideActive && currentStep?.highlight && currentStep.highlight !== id;

  const N = rawSamples.length;

  const handleAlgoChange = (algo) => {
    setConfig({ ...config, filterType: algo });
    markAction("SELECT_ALGO");
  };

  const handleNoiseToggle = (key) => {
    setNoise({ ...noise, [key]: !noise[key] });
  };

  return (
    <div className={styles.rightPanelContainer}>
      <div className={styles.right}>
        <h2>Control Panel</h2>

        {/* Card 1: Signal Setup */}
        <div className={`${styles.box} ${isFaded("generateButton") ? styles.faded : ""} ${isHighlighted("generateButton") ? styles.highlight : ""}`}>
          <h3>Signal Setup</h3>
          <label>Source Type</label>
          <select value={useSynthetic ? "synthetic" : "csv"} onChange={(e) => setUseSynthetic(e.target.value === "synthetic")}>
            <option value="csv">Real ECG Datasets</option>
            <option value="synthetic">Synthetic AR Process</option>
          </select>

          {!useSynthetic && (
            <>
              <label>Select Dataset</label>
              <select value={csvFileName} onChange={(e) => setCsvFileName(e.target.value)}>
                <option value="ecg100.csv">ecg100.csv</option>
                <option value="ecg200.csv">ecg200.csv</option>
                <option value="ecg300.csv">ecg300.csv</option>
              </select>
            </>
          )}

          <label>Duration: {time}s</label>
          <input type="range" min="2" max="10" value={time} onChange={(e) => setTime(Number(e.target.value))} />
          
          <label>Sampling Rate: 500 Hz</label>
          <button onClick={() => { setGenerateECG(true); markAction("GENERATE_SIGNAL"); }}>Generate ECG Signal</button>
        </div>

        {/* Card 2: Add Noise */}
        <div className={styles.box}>
          <h3>Add Noise</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label><input type="checkbox" checked={noise.baseline} onChange={() => handleNoiseToggle('baseline')} /> Baseline Wander</label>
            <label><input type="checkbox" checked={noise.powerline} onChange={() => handleNoiseToggle('powerline')} /> Powerline (50Hz)</label>
            <label><input type="checkbox" checked={noise.emg} onChange={() => handleNoiseToggle('emg')} /> EMG Noise</label>
          </div>
          <button onClick={() => setApplyNoiseTrigger(true)} style={{ marginTop: '10px' }}>Add Noise to Signal</button>
        </div>

        {/* Card 3: Adaptive Filter */}
        <div className={`${styles.box} ${isFaded("algorithmSelector") ? styles.faded : ""} ${isHighlighted("algorithmSelector") ? styles.highlight : ""}`}>
          <h3>Adaptive Filter (NLMS / LMS / RLS)</h3>
          <label>Algorithm</label>
          <select value={config.filterType} onChange={(e) => handleAlgoChange(e.target.value)}>
            <option value="LMS">LMS</option>
            <option value="RLS">RLS</option>
          </select>

          <label>Filter Order M</label>
          <input type="number" value={config.filterOrder} onChange={(e) => setConfig({...config, filterOrder: Number(e.target.value)})} />

          <label>Step size µ (0.01 to 0.2)</label>
          <input type="range" min="0.01" max="0.2" step="0.01" value={config.stepSize} onChange={(e) => setConfig({...config, stepSize: Number(e.target.value)})} />

          {/* NEW FIELDS */}
          <label>Window Length L (10–100)</label>
          <input type="number" value={config.windowLength} onChange={(e) => setConfig({...config, windowLength: Number(e.target.value)})} />

          <label>Threshold K (1.5–4.0)</label>
          <input type="number" step="0.1" value={config.thresholdK} onChange={(e) => setConfig({...config, thresholdK: Number(e.target.value)})} />

          {config.filterType === "RLS" && (
            <>
              <label>Forgetting factor λ (RLS)</label>
              <input type="number" step="0.01" value={config.forgettingFactor} onChange={(e) => setConfig({...config, forgettingFactor: Number(e.target.value)})} />
              <label>Init delta δ (RLS)</label>
              <input type="number" step="0.01" value={config.regularization} onChange={(e) => setConfig({...config, regularization: Number(e.target.value)})} />
            </>
          )}

          <div style={{ display: 'flex', gap: '5px', marginTop: '15px' }}>
            <button className={styles.tealButton} onClick={handleRunLMS}>Run LMS Predictor</button>
            <button className={styles.tealButton} onClick={handleRunRLS}>Run RLS Predictor</button>
          </div>
        </div>

        {/* Card 4: Non-Stationarity Injection */}
        <div className={styles.box}>
          <h3>Non-Stationarity Injection</h3>
          <label>Change-point n* position: Sample {changePoint} / {N}</label>
          <input 
            type="range" 
            min="100" 
            max={N > 200 ? N - 100 : 100} 
            value={changePoint} 
            onChange={(e) => setChangePoint(Number(e.target.value))} 
          />

          <label>Non-stationarity type</label>
          <select value={injectionType} onChange={(e) => setInjectionType(e.target.value)}>
            <option value="ar">AR Parameter Shift (Spectral)</option>
            <option value="wander">Baseline Wander (Mean)</option>
            <option value="variance">Variance Jump (EMG-style)</option>
            <option value="all">All Combined</option>
          </select>

          <label>Wander Amplitude (0–0.5): {wanderAmp}</label>
          <input type="range" min="0" max="0.5" step="0.01" value={wanderAmp} onChange={(e) => setWanderAmp(Number(e.target.value))} />

          <label>Noise Std (0.05–0.4): {noiseStd}</label>
          <input type="range" min="0.05" max="0.4" step="0.01" value={noiseStd} onChange={(e) => setNoiseStd(Number(e.target.value))} />

          <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
            <button className={styles.tealButton} onClick={handleInject}>Inject Change-point</button>
            <button onClick={handleRestore}>Restore Original</button>
          </div>
        </div>
      </div>
    </div>
  );
};
