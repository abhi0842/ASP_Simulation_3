/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { generateStochasticSignal } from "../utils/filters";
import { runLMS, runRLS, injectChangePoint } from "../adaptiveFilters";

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

  // Dataset selection
  const [csvFileName, setCsvFileName] = useState("ecg100.csv");
  const [useSynthetic, setUseSynthetic] = useState(false);

  // --- Guided Mode State ---
  const [guideActive, setGuideActive] = useState(false);
  const [step, setStep] = useState(0);
  const [actions, setActions] = useState({});

  useEffect(() => {
    // Show welcome modal on initial load
    setGuideActive(true);
  }, []);

  const markAction = (action) => {
    setActions((prev) => ({ ...prev, [action]: true }));
  };

  const steps = [
    {
      title: "Welcome to Simulation",
      content: "Would you like help with this lab?",
      type: "welcome",
      targetId: "guideButton",
      preferredPlacement: "bottom",
    },
    {
      title: "1. Generate Signal",
      content: "Click to create a stochastic ECG process.",
      highlight: "generateButton",
      requiredAction: "GENERATE_SIGNAL",
      preferredPlacement: "left",
    },
    {
      title: "2. Select Algorithm",
      content: "Choose LMS or RLS to start.",
      highlight: "algorithmSelector",
      requiredAction: "SELECT_ALGO",
      preferredPlacement: "left",
    },
    {
      title: "3. Run Predictor",
      content: "Observe the adaptive filter learning.",
      highlight: "runButton",
      requiredAction: "RUN_SIMULATION",
      preferredPlacement: "left",
    },
    {
      title: "4. Inject Change",
      content: "Test the filter's adaptation to shifts.",
      highlight: "injectButton",
      requiredAction: "INJECT_CHANGE",
      preferredPlacement: "left",
    },
    {
      title: "5. Error Spike",
      content: "The spike reveals WHEN the change occurred.",
      highlight: "errorGraph",
      preferredPlacement: "top",
    },
    {
      title: "6. Weight Drift",
      content: "The drift reveals WHAT changed in the model.",
      highlight: "weightsGraph",
      preferredPlacement: "top",
    },
    {
      title: "Lab Completed",
      content: "You've mastered non-stationarity detection!",
      preferredPlacement: "center",
    },
  ];

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

  const handleInject = () => {
    const originalY = rawSamples.map(s => s.y);
    const injectedY = injectChangePoint(originalY, changePoint, injectionType, wanderAmp, noiseStd, originalFs);
    setCurrentSignal(injectedY);
    setInjected(true);

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

  const handleRestore = () => {
    setCurrentSignal(rawSamples.map(s => s.y));
    setInjected(false);
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

        config,
        setConfig,

        showInstruction,
        setShowInstruction,
        buttonRef,

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
