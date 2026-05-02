import { useMemo, useContext, useEffect } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./ecgFilter.module.css";
import { Line } from "react-chartjs-2";
import annotationPlugin from 'chartjs-plugin-annotation';
import { filterSignalLMS, filterSignalRLS } from "../../utils/filters";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, annotationPlugin);

function resampleForDisplay(data, fsOriginal, fsUser) {
  const step = fsOriginal / fsUser;
  if (step <= 1) return data;
  const out = [];
  for (let i = 0; i < data.length; i += step) out.push(data[Math.floor(i)]);
  return out;
}

function inferFs(dataAll) {
  if (!dataAll || dataAll.length < 2) return 500;
  const dt = dataAll[1].x - dataAll[0].x;
  if (dt > 0) return 1 / dt;
  return 500;
}

export const EcgFilter = () => {
  const {
    time,
    originalFs,
    config,
    rawSamples,
    noisySamples,
    setFilteredSamples,
    setMetrics,
    setDiagnostics,
    thresholdK,
    step,
    steps,
  } = useContext(SimulationContext);

  const currentStep = steps[step];

  const filteredData = useMemo(() => {
    const inputSamples = noisySamples.length > 0 ? noisySamples : rawSamples;
    if (!inputSamples.length) return { mapped: [], error: [], Pe: [], flags: [], original: [] };

    const fsOriginal = inferFs(inputSamples);
    const display = resampleForDisplay(inputSamples, fsOriginal, originalFs);
    const xSignal = display.map((p) => p.y);

    let results = { y: [], e: [], e2: [], Pe: [], detectionFlags: [] };

    const options = {
      filterOrder: config.filterOrder,
      thresholdK: thresholdK,
    };

    if (config.filterType === "LMS") {
      results = filterSignalLMS(xSignal, {
        ...options,
        stepSize: config.stepSize,
      });
    } else if (config.filterType === "RLS") {
      results = filterSignalRLS(xSignal, {
        ...options,
        forgettingFactor: config.forgettingFactor,
        regularization: config.regularization,
      });
    }

    const mse = results.e2.reduce((a, b) => a + b, 0) / results.e2.length;
    setMetrics({
      algorithm: config.filterType,
      order: config.filterOrder,
      mse: mse.toFixed(6),
    });

    setDiagnostics({
      error: results.e,
      errorPower: results.Pe,
      detectionFlags: results.detectionFlags,
    });

    const timePoints = display.map(p => p.x);
    const midpoint = timePoints[Math.floor(timePoints.length / 2)];

    return {
      mapped: display.map((p, i) => ({ x: p.x, y: results.y[i] ?? 0 })),
      original: display.map((p) => ({ x: p.x, y: p.y })),
      error: display.map((p, i) => ({ x: p.x, y: results.e[i] ?? 0 })),
      Pe: results.Pe.map((p, i) => ({ x: display[i].x, y: p })),
      flags: results.detectionFlags.map((f, i) => (f ? { x: display[i].x, y: results.Pe[i] } : null)).filter(Boolean),
      midpoint,
      threshold: results.Pe.reduce((a, b) => a + b, 0) / results.Pe.length + thresholdK * Math.sqrt(results.Pe.reduce((a, b) => a + Math.pow(b - (results.Pe.reduce((a, b) => a + b, 0) / results.Pe.length), 2), 0) / results.Pe.length)
    };
  }, [time, originalFs, config, rawSamples, noisySamples, setMetrics, setDiagnostics, thresholdK]);

  useEffect(() => {
    setFilteredSamples(filteredData.mapped);
  }, [filteredData.mapped, setFilteredSamples]);

  const commonOptions = {
    responsive: true,
    animation: false,
    parsing: false,
    plugins: { 
      legend: { display: true },
      annotation: {
        annotations: {
          line1: {
            type: 'line',
            xMin: filteredData.midpoint,
            xMax: filteredData.midpoint,
            borderColor: 'gray',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              content: 'Change Point',
              enabled: true
            }
          }
        }
      }
    },
    scales: {
      x: { type: "linear", title: { display: true, text: "Time (s)" } },
      y: { title: { display: true, text: "Amplitude" } },
    },
  };

  const trackingData = {
    datasets: [
      {
        label: "Original Signal x(n)",
        data: filteredData.original,
        borderColor: "#3498db",
        borderWidth: 1,
        pointRadius: 0,
      },
      {
        label: `Predicted y(n) (${config.filterType})`,
        data: filteredData.mapped,
        borderColor: config.filterType === "LMS" ? "#3498db" : "#e74c3c",
        borderWidth: 2,
        pointRadius: 0,
      },
    ],
  };

  const errorData = {
    datasets: [
      {
        label: "Error e(n)",
        data: filteredData.error,
        borderColor: "#95a5a6",
        borderWidth: 1,
        pointRadius: 0,
      },
    ],
  };

  const detectionData = {
    datasets: [
      {
        label: "Error Power P_e(n)",
        data: filteredData.Pe,
        borderColor: config.filterType === "LMS" ? "#3498db" : "#e74c3c",
        borderWidth: 1.5,
        pointRadius: 0,
      },
      {
        label: "Threshold",
        data: [{x: 0, y: filteredData.threshold}, {x: time, y: filteredData.threshold}],
        borderColor: "rgba(0,0,0,0.2)",
        borderDash: [2, 2],
        pointRadius: 0,
      },
      {
        label: "Detections",
        data: filteredData.flags,
        borderColor: "#f1c40f",
        backgroundColor: "#f1c40f",
        pointRadius: 4,
        showLine: false,
      },
    ],
  };

  return (
    <div className={styles.signalContainer}>
      <div className={styles.plotGroup}>
        <h3>Signal Tracking</h3>
        <Line data={trackingData} options={commonOptions} />
      </div>

      <div className={styles.plotGroup}>
        <h3>Estimation Error</h3>
        <Line data={errorData} options={commonOptions} />
      </div>

      <div className={`${styles.plotGroup} ${currentStep?.highlight === "detectionGraph" ? styles.highlight : ""}`}>
        <h3>Non-Stationarity Detection</h3>
        <Line data={detectionData} options={commonOptions} />
      </div>
    </div>
  );

};

