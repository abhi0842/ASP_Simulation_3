import { useContext, useState, useEffect } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./rightPanel.module.css";
import Swal from "sweetalert2";

export const RightPanel = () => {
  const {
    time,
    setTime,
    originalFs,
    // setUserFs,
    setGenerateECG,
    setApplyNoiseTrigger,
    config,
    setConfig,
    setFilteredECG,
    noise,
    setNoise,
    csvFilePath,
    prevPathRef,
    setCsvFilePath,
    generateECG,
    setApplypsdTrigger,
    setFilteredSamples,
    // Guided mode
    step,
    markAction,
    steps,
    isChangeInjected,
    setIsChangeInjected,
    noiseLevel,
    setNoiseLevel,
    thresholdK,
    setThresholdK,
  } = useContext(SimulationContext);

  const currentStep = steps[step];

  const [adaptiveAlgo, setAdaptiveAlgo] = useState(config.filterType === "NLMS" ? "LMS" : config.filterType);
  const [filterOrder, setFilterOrder] = useState(config.filterOrder ?? 32);
  const [stepSize, setStepSize] = useState(config.stepSize ?? 0.01);
  const [forgettingFactor, setForgettingFactor] = useState(config.forgettingFactor ?? 0.99);
  const [regularization, setRegularization] = useState(config.regularization ?? 0.01);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const handleGenerateSignal = () => {
    setGenerateECG(true);
    markAction("GENERATE_SIGNAL");
  };

  const handleInjectChange = () => {
    setIsChangeInjected(true);
    markAction("INJECT_CHANGE");
    setGenerateECG(true); // Re-generate with change
  };

  const handleAlgoChange = (algo) => {
    setAdaptiveAlgo(algo);
    markAction("SELECT_ALGO");
    if (step >= 6) markAction("SELECT_ALGO"); // For Step 7 comparison
  };

  const handleParamChange = (type, val) => {
    if (type === "mu") setStepSize(val);
    if (type === "lambda") setForgettingFactor(val);
    markAction("ADJUST_PARAMS");
  };

  const handleNoiseChange = (val) => {
    setNoiseLevel(val);
    markAction("ADJUST_PARAMS");
    if (step >= 8) markAction("ADJUST_PARAMS"); // For Step 8 noise
    setGenerateECG(true); // Re-generate with noise
  };

  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : base + "/";
  const assetPath = (name) => normalizedBase + name;
  const runFilter = () => {
    if (!generateECG) {
      Swal.fire({
        icon: "info",
        title: "Oops...",
        text: "Please generate signal first!",
      });
      return;
    }

    const sanitizedOrder = clamp(Math.floor(Number(filterOrder) || 1), 1, 256);
    const sanitizedMu = adaptiveAlgo === "LMS"
      ? clamp(Number(stepSize) || 0.01, 1e-8, 1)
      : 0.1;
    const sanitizedLambda = clamp(Number(forgettingFactor) || 0.99, 0.9, 0.999999);
    const sanitizedDelta = clamp(Number(regularization) || 0.01, 1e-12, 1);

    setFilterOrder(sanitizedOrder);
    if (adaptiveAlgo === "LMS") setStepSize(sanitizedMu);
    setForgettingFactor(Math.round(sanitizedLambda * 1e6) / 1e6);
    setRegularization(Number(sanitizedDelta));

    const newConfig = {
      ...config,
      filterType: adaptiveAlgo,
      filterOrder: sanitizedOrder,
      stepSize: sanitizedMu,
      forgettingFactor: sanitizedLambda,
      regularization: sanitizedDelta,
    };
    setConfig(newConfig);
    setFilteredECG(true);
    markAction("RUN_SIMULATION");
  };

  useEffect(() => {
    if (prevPathRef.current !== csvFilePath) {
      setApplyNoiseTrigger(false);
      setFilteredECG(false);
      setApplypsdTrigger(false);
      setFilteredSamples([]);
      prevPathRef.current = csvFilePath;
    }
  }, [csvFilePath, prevPathRef, setApplyNoiseTrigger, setFilteredECG, setApplypsdTrigger, setFilteredSamples]); 

  return (
    <div className={styles.rightPanelContainer}>
      <div className={styles.right}>
        <h2>Non-Stationarity Detection Lab</h2>

        <div className={`${styles.box} ${currentStep?.highlight === "generateButton" ? styles.highlight : ""}`}>
          <h3>Signal Setup</h3>
          <label>Select Dataset</label>
          <select value={csvFilePath} onChange={(e) => setCsvFilePath(e.target.value)}>
            <option value={assetPath("ecg200.csv")}>Dataset 1</option>
            <option value={assetPath("ecg300.csv")}>Dataset 2</option>
            <option value={assetPath("ecg100.csv")}>Dataset 3</option>
          </select>

          <label>Duration (seconds) : <span>{time} s</span></label>
          <input
            type="range"
            min="1"
            max="50"
            value={time}
            onChange={(e) => setTime(Number(e.target.value))}
          />

          <button onClick={handleGenerateSignal}>
            Generate Signal
          </button>

          <button 
            className={`${currentStep?.highlight === "injectChangeButton" ? styles.highlight : ""}`}
            onClick={handleInjectChange}
            style={{ marginTop: "10px", backgroundColor: isChangeInjected ? "#27ae60" : "#e67e22" }}
          >
            {isChangeInjected ? "Change Injected ✓" : "Inject Change"}
          </button>
        </div>

        <div className={`${styles.box} ${currentStep?.highlight === "algorithmSelector" || currentStep?.highlight === "algorithmToggle" ? styles.highlight : ""}`}>
          <h3>Adaptive Filter</h3>

          <label>Algorithm</label>
          <select value={adaptiveAlgo} onChange={(e) => handleAlgoChange(e.target.value)}>
            <option value="LMS">LMS (Slow Adaptation)</option>
            <option value="RLS">RLS (Fast Adaptation)</option>
          </select>

          <div className={`${currentStep?.highlight === "parameterSliders" ? styles.highlight : ""}`}>
            {adaptiveAlgo === "LMS" ? (
              <>
                <label>Step size μ: {stepSize}</label>
                <input
                  type="range"
                  min="0.001"
                  max="0.1"
                  step="0.001"
                  value={stepSize}
                  onChange={(e) => handleParamChange("mu", Number(e.target.value))}
                />
              </>
            ) : (
              <>
                <label>Forgetting factor λ: {forgettingFactor}</label>
                <input
                  type="range"
                  min="0.90"
                  max="0.999"
                  step="0.001"
                  value={forgettingFactor}
                  onChange={(e) => handleParamChange("lambda", Number(e.target.value))}
                />
              </>
            )}
          </div>

          <div className={`${currentStep?.highlight === "noiseSlider" ? styles.highlight : ""}`} style={{ marginTop: "15px" }}>
            <label>Noise Level: {noiseLevel}</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={noiseLevel}
              onChange={(e) => handleNoiseChange(Number(e.target.value))}
            />
          </div>

          <label style={{ marginTop: "15px" }}>Threshold K: {thresholdK}</label>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={thresholdK}
            onChange={(e) => setThresholdK(Number(e.target.value))}
          />

          <div className={styles.psdContainer}>
            <button 
              className={`${currentStep?.highlight === "runButton" ? styles.highlight : ""}`}
              onClick={runFilter}
            >
              Run Simulation
            </button>
          </div>
        </div>
      </div>
    </div>
  );

};
