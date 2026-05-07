/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { generateStochasticSignal } from "../utils/filters";
import { runLMS, runRLS, injectChangePoint } from "../adaptiveFilters";
import { guideSteps } from "../guideSteps";

export const SimulationContext = createContext();

export const SimulationProvider = ({ children }) => {
  // Time window shown in graphs (seconds)
  const [time, setTime] = useState(5);
  // Estimated sampling frequency (Hz)
  const [originalFs, setOriginalFs] = useState(500);

  // signals
  const [rawSamples, setRawSamples] = useState([]); // original dataset samples
  const [currentSignal, setCurrentSignal] = useState([]); // signal after injection
  const [noisySamples, setNoisySamples] = useState([]); // array of { x: seconds, y: noisy ECG }
  const [filteredSamples, setFilteredSamples] = useState([]); // array of { x, y } adaptive-filter output
  
  // Results from predictors
  const [lmsResult, setLmsResult] = useState(null);
  const [rlsResult, setRlsResult] = useState(null);

  // Non-stationarity state
  const [changePoint, setChangePoint] = useState(1250); // index n*
  const [injectionType, setInjectionType] = useState('ar');
  const [wanderAmp, setWanderAmp] = useState(0.15);
  const [noiseStd, setNoiseStd] = useState(0.12);
  const [injected, setInjected] = useState(false);
  const [injectedAt, setInjectedAt] = useState(null); // Time of injection for flatline effect
  const [isSaturated, setIsSaturated] = useState(false);

  // Adaptive filter params
  const [config, setConfig] = useState({
    filterType: "LMS",
    filterOrder: 2, 
    stepSize: 0.05, 
    windowLength: 40,
    thresholdK: 2.5,
    forgettingFactor: 0.97,
    regularization: 0.01,
  });

  // UI triggers (RESTORING ORIGINAL NAMES)
  const [generateECG, setGenerateECG] = useState(false);
  const [applyNoiseTrigger, setApplyNoiseTrigger] = useState(false);
  const [filteredECG, setFilteredECG] = useState(false);
  const [applypsdTrigger, setApplypsdTrigger] = useState(false);

  // Noise toggles
  const [noise, setNoise] = useState({
    baseline: false,
    powerline: false,
    emg: false,
  });

  // Instruction panel state / button ref used in Home.jsx
  const [showInstruction, setShowInstruction] = useState(false);
  const buttonRef = useRef(null);
  const instructionPanelRef = useRef(null);

  // Dataset selection
  const [csvFileName, setCsvFileName] = useState("ecg100.csv");
  const [useSynthetic, setUseSynthetic] = useState(false);

  // --- Guided Mode State ---
  const [guideActive, setGuideActive] = useState(false);
  const [step, setStep] = useState(0);
  const [actions, setActions] = useState({});

  const markAction = (action) => {
    setActions((prev) => ({ ...prev, [action]: true }));
  };

  const steps = guideSteps;

  const currentStep = steps[step];
  const canProceed = !currentStep?.requiredAction || actions[currentStep.requiredAction];

  useEffect(() => {
    if (currentStep?.requiredAction && actions[currentStep.requiredAction]) {
      setStep((prev) => Math.min(steps.length - 1, prev + 1));
    }
  }, [actions, currentStep, steps.length]);

  const handleGenerateSignal = useCallback(() => {
    if (useSynthetic) {
      const samples = generateStochasticSignal({
        fs: originalFs,
        duration: time,
        type: "structural",
        noiseVariance: 0.1,
        changePoint: 0.5,
      });
      setRawSamples(samples);
      setCurrentSignal(samples.map(s => s.y));
      resetSimulation(samples.length);
    } else {
      const base = import.meta.env.BASE_URL || "/";
      const normalizedBase = base.endsWith("/") ? base : base + "/";
      const filePath = `${normalizedBase}${csvFileName}`;
      
      Papa.parse(filePath, {
        download: true,
        header: false,
        dynamicTyping: true,
        complete: (results) => {
          const data = results.data.flat().filter(v => typeof v === 'number');
          // Map to time points based on duration and fs
          const N = Math.min(data.length, Math.floor(time * originalFs));
          const samples = data.slice(0, N).map((y, i) => ({
            x: i / originalFs,
            y: y
          }));
          setRawSamples(samples);
          setCurrentSignal(samples.map(s => s.y));
          resetSimulation(samples.length);
        },
        error: (err) => {
          console.error("Error loading CSV:", err);
        }
      });
    }
  }, [useSynthetic, csvFileName, originalFs, time]);

  const resetSimulation = (length) => {
    setFilteredECG(false);
    setLmsResult(null);
    setRlsResult(null);
    setInjected(false);
    setChangePoint(Math.floor(length / 2));
  };

  useEffect(() => {
    if (generateECG) {
      handleGenerateSignal();
      setGenerateECG(false);
    }
  }, [generateECG, handleGenerateSignal]);

  const injectTimerRef = useRef(null);

  const handleInject = () => {
    const originalY = rawSamples.map(s => s.y);
    const injectedY = injectChangePoint(originalY, changePoint, injectionType, wanderAmp, noiseStd, originalFs);
    setCurrentSignal(injectedY);
    setInjected(true);
    setInjectedAt(Date.now()); // Set injection time for saturation effect
    setIsSaturated(true);

    // Clear previous timer if any
    if (injectTimerRef.current) clearTimeout(injectTimerRef.current);
    
    // Part 3 point 13 — Explicitly reset saturation after 3 seconds (2s flat + 1s ramp)
    injectTimerRef.current = setTimeout(() => {
      setIsSaturated(false);
    }, 3000);

    // Re-run predictors if they were already active to show the effect of the change immediately
    if (lmsResult) {
      const res = runLMS(injectedY, config.filterOrder, config.stepSize, config.windowLength, config.thresholdK);
      setLmsResult(res);
    }
    if (rlsResult) {
      const res = runRLS(injectedY, config.filterOrder, config.forgettingFactor, config.regularization, config.windowLength, config.thresholdK);
      setRlsResult(res);
    }

    markAction("INJECT_CHANGE");
  };

  useEffect(() => {
    return () => {
      if (injectTimerRef.current) clearTimeout(injectTimerRef.current);
    };
  }, []);

  const handleRestore = () => {
    setCurrentSignal(rawSamples.map(s => s.y));
    setInjected(false);
    setIsSaturated(false);
    if (injectTimerRef.current) clearTimeout(injectTimerRef.current);
    setLmsResult(null);
    setRlsResult(null);
  };

  const handleRunLMS = () => {
    const res = runLMS(currentSignal, config.filterOrder, config.stepSize, config.windowLength, config.thresholdK);
    setLmsResult(res);
    markAction("RUN_SIMULATION");
  };

  const handleRunRLS = () => {
    const res = runRLS(currentSignal, config.filterOrder, config.forgettingFactor, config.regularization, config.windowLength, config.thresholdK);
    setRlsResult(res);
    markAction("RUN_SIMULATION");
  };

  return (
    <SimulationContext.Provider
      value={{
        time,
        setTime,
        originalFs,
        setOriginalFs,

        rawSamples,
        setRawSamples,
        currentSignal,
        noisySamples,
        setNoisySamples,
        filteredSamples,
        setFilteredSamples,
        
        lmsResult,
        rlsResult,
        handleRunLMS,
        handleRunRLS,

        generateECG,
        setGenerateECG,
        applyNoiseTrigger,
        setApplyNoiseTrigger,
        filteredECG,
        setFilteredECG,
        applypsdTrigger,
        setApplypsdTrigger,

        noise,
        setNoise,

        csvFileName,
        setCsvFileName,
        useSynthetic,
        setUseSynthetic,

        changePoint,
        setChangePoint,
        injectionType,
        setInjectionType,
        wanderAmp,
        setWanderAmp,
        noiseStd,
        setNoiseStd,
        handleInject,
        handleRestore,
        injected,
        injectedAt,
        isSaturated,

        config,
        setConfig,

        showInstruction,
        setShowInstruction,
        buttonRef,
        instructionPanelRef,

        step,
        setStep,
        actions,
        markAction,
        steps,
        guideActive,
        setGuideActive,
        canProceed,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};
