/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { generateStochasticSignal } from "../utils/filters";
import { runLMS, runRLS, injectChangePoint } from "../adaptiveFilters";
import { guideSteps } from "../guideSteps";
import { normalizeECGData, createTimeSeriesSamples, validateECGSignal, extractECGFromCSV } from "../utils/csvParser";

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
  
  // Multi-file signals storage
  const [multiSignals, setMultiSignals] = useState({
    ecg100: null,
    ecg200: null,
    ecg300: null,
  });
  const [multiResults, setMultiResults] = useState({
    ecg100: { lms: null, rls: null },
    ecg200: { lms: null, rls: null },
    ecg300: { lms: null, rls: null },
  });

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
  const [csvFileName, setCsvFileName] = useState("ecg200.csv");
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
      console.log(`Loading ECG file from: ${filePath}`);
      
      Papa.parse(filePath, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            // Check for Papa.parse errors
            if (results.errors && results.errors.length > 0) {
              console.warn("CSV parsing warnings:", results.errors);
            }

            // Extract ECG column from parsed results
            const rawData = (results.data || [])
              .map(row => {
                // Try common ECG column names
                return row.ECG_I || row['ECG_I'] || row.ECG || Object.values(row)[1];
              })
              .filter(v => typeof v === 'number' && !isNaN(v))
              .map(v => parseFloat(v));
            
            if (rawData.length === 0) {
              throw new Error("No ECG data found in CSV file. Expected column named 'ECG_I'");
            }

            const normalizedData = normalizeECGData(rawData);
            
            // Limit to specified duration
            const N = Math.min(normalizedData.length, Math.floor(time * originalFs));
            const limitedData = normalizedData.slice(0, N);
            
            // Create time series samples
            const samples = createTimeSeriesSamples(limitedData, originalFs);
            
            // Validate signal
            const validation = validateECGSignal(samples);
            if (!validation.isValid) {
              console.warn("⚠ ECG Signal Issues:", validation.issues);
            }
            console.log(`✓ Successfully loaded ${csvFileName}:`, validation.stats);

            setRawSamples(samples);
            setCurrentSignal(samples.map(s => s.y));
            resetSimulation(samples.length);
          } catch (err) {
            console.error("❌ Error processing ECG CSV:", err.message);
            console.error("Stack:", err);
          }
        },
        error: (err) => {
          console.error("Error loading CSV file:", err);
        }
      });
    }
  }, [useSynthetic, csvFileName, originalFs, time]);

  const handleLoadAllECGs = useCallback(() => {
    const base = import.meta.env.BASE_URL || "/";
    const normalizedBase = base.endsWith("/") ? base : base + "/";
    const fileNames = ["ecg100.csv", "ecg200.csv", "ecg300.csv"];
    const loadedSignals = {};
    let loadedCount = 0;

    fileNames.forEach((fileName) => {
      const filePath = `${normalizedBase}${fileName}`;
      console.log(`Loading ${fileName} from: ${filePath}`);
      Papa.parse(filePath, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            // Check for Papa.parse errors
            if (results.errors && results.errors.length > 0) {
              console.warn(`CSV parsing warnings for ${fileName}:`, results.errors);
            }

            // Extract ECG column from parsed results
            const rawData = (results.data || [])
              .map(row => {
                // Try common ECG column names
                return row.ECG_I || row['ECG_I'] || row.ECG || Object.values(row)[1];
              })
              .filter(v => typeof v === 'number' && !isNaN(v))
              .map(v => parseFloat(v));
            
            if (rawData.length === 0) {
              console.error(`❌ No numeric data found in ${fileName}`);
              loadedCount++;
              return;
            }

            const normalizedData = normalizeECGData(rawData);

            if (normalizedData.length === 0) {
              console.warn(`⚠ No valid data in ${fileName}`);
              loadedCount++;
              return;
            }

            // Limit to specified duration
            const N = Math.min(normalizedData.length, Math.floor(time * originalFs));
            const limitedData = normalizedData.slice(0, N);
            
            // Create time series samples
            const samples = createTimeSeriesSamples(limitedData, originalFs);
            
            // Validate signal
            const validation = validateECGSignal(samples);
            console.log(`✓ Loaded ${fileName}:`, validation.stats);

            const key = fileName.replace(".csv", "");
            loadedSignals[key] = samples;
            loadedCount++;

            if (loadedCount === 3) {
              setMultiSignals(loadedSignals);
              // Set first one as current for display
              if (loadedSignals.ecg100) {
                setRawSamples(loadedSignals.ecg100);
                setCurrentSignal(loadedSignals.ecg100.map(s => s.y));
                resetSimulation(loadedSignals.ecg100.length);
                console.log("✓ All ECG files loaded and ready!");
              }
            }
          } catch (err) {
            console.error(`❌ Error processing ${fileName}:`, err.message);
            loadedCount++;
          }
        },
        error: (err) => {
          console.error(`❌ Error loading ${fileName}:`, err);
          loadedCount++;
        }
      });
    });
  }, [originalFs, time]);

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

  const handleRunLMSAllFiles = () => {
    const newResults = { ...multiResults };
    Object.keys(multiSignals).forEach((key) => {
      if (multiSignals[key]) {
        const signal = multiSignals[key].map(s => s.y);
        const lmsRes = runLMS(signal, config.filterOrder, config.stepSize, config.windowLength, config.thresholdK);
        newResults[key] = { ...newResults[key], lms: lmsRes };
      }
    });
    setMultiResults(newResults);
  };

  const handleRunRLSAllFiles = () => {
    const newResults = { ...multiResults };
    Object.keys(multiSignals).forEach((key) => {
      if (multiSignals[key]) {
        const signal = multiSignals[key].map(s => s.y);
        const rlsRes = runRLS(signal, config.filterOrder, config.forgettingFactor, config.regularization, config.windowLength, config.thresholdK);
        newResults[key] = { ...newResults[key], rls: rlsRes };
      }
    });
    setMultiResults(newResults);
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

        multiSignals,
        multiResults,
        handleLoadAllECGs,
        handleRunLMSAllFiles,
        handleRunRLSAllFiles,

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
