import { useMemo, useContext, useEffect, useState } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./ecgUnfilter.module.css";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
);
function resampleForDisplay(data, fsOriginal, fsUser) {
  const step = fsOriginal / fsUser;

  if (step <= 1) return data; // show all if user wants higher rate

  const out = [];
  for (let i = 0; i < data.length; i += step) {
    out.push(data[Math.floor(i)]);
  }
  return out;
}
function inferFs(dataAll) {
  if (dataAll.length < 2) return 500;
  const dt = dataAll[1].x - dataAll[0].x;
  // console.log(1 / dt);
  if (dt > 0) return 1 / dt;

  return 500;
}

export const EcgUnfilter = () => {
  const { time, originalFs, setGenerateSignal, rawSamples, currentSignal, changePoint, injected, injectedAt, isSaturated } =
    useContext(SimulationContext);

  // Force re-renders during flatline/ramp period
  const [, setTick] = useState(0);
  useEffect(() => {
    if (isSaturated && injectedAt) {
      const timer = setInterval(() => {
        const elapsed = Date.now() - injectedAt;
        if (elapsed < 3500) { 
          setTick(t => t + 1);
        } else {
          clearInterval(timer);
        }
      }, 50);
      return () => clearInterval(timer);
    }
  }, [isSaturated, injectedAt]);

  const data = useMemo(() => {
    if (!rawSamples.length || !currentSignal.length) return [];
    
    // Map currentSignal (Y values) back to time points
    const mappedSamples = rawSamples.map((s, i) => ({
      x: s.x,
      y: currentSignal[i] !== undefined ? currentSignal[i] : s.y
    }));

    const fsOriginal = inferFs(mappedSamples);
    const displayData = resampleForDisplay(mappedSamples, fsOriginal, originalFs);
    let limited = displayData.filter((p) => p.x <= time);

    // Part 3 — Inject Changes Flattens Unfiltered Data
    const FLATLINE_DURATION = 2000;
    const RAMP_DURATION = 1000;
    if (isSaturated && injectedAt) {
      const elapsed = Date.now() - injectedAt;
      if (elapsed < FLATLINE_DURATION + RAMP_DURATION) {
        const cpIndex = changePoint;
        const cpTime = cpIndex / originalFs;
        
        limited = limited.map(p => {
          if (p.x >= cpTime) {
            const lastNormalValue = currentSignal[cpIndex] || 0;
            if (elapsed < FLATLINE_DURATION) {
              return { ...p, y: lastNormalValue };
            } else {
              // Gradual ramp back
              const rampElapsed = elapsed - FLATLINE_DURATION;
              const alpha = Math.min(1, rampElapsed / RAMP_DURATION);
              return { ...p, y: lastNormalValue * (1 - alpha) + p.y * alpha };
            }
          }
          return p;
        });
      }
    }

    return limited;
  }, [time, originalFs, rawSamples, currentSignal, injected, injectedAt, isSaturated, changePoint]);


  const chartData = {
    datasets: [
      {
        label: "ECG Signal",
        data,
        borderColor: "#0078d4",
        borderWidth: 1,
        pointRadius: 0,
        tension: 0,
      },
    ],
  };

  if (injected) {
    const cpTime = changePoint / originalFs;
    // Find min/max for vertical line
    const yValues = data.map(p => p.y);
    const minY = Math.min(...yValues, -0.5);
    const maxY = Math.max(...yValues, 0.5);

    chartData.datasets.push({
      label: "Change Point",
      data: [{ x: cpTime, y: minY }, { x: cpTime, y: maxY }],
      borderColor: "red",
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 0,
      showLine: true,
    });
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: "Time (s)", font: { size: 12, weight: "bold" } },
        ticks: { font: { size: 11 } },
      },
      y: {
        title: { display: true, text: "Amplitude (mV)", font: { size: 12, weight: "bold" } },
        ticks: { font: { size: 11 } },
      },
    },
  };

  return (
    <div className={styles.signalContainer}>
      <h3>ECG Signal (Unfiltered)</h3>
      <div className={styles.graphContainer}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};
