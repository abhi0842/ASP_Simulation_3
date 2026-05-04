import { useMemo, useContext, useEffect } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./ecgNoisy.module.css";

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
import {
  addBaselineWander,
  addPowerlineNoise,
  addMuscleNoise,
} from "../../utils/addNoise";

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

export const EcgNoisy = () => {
  const {
    time,
    originalFs,
    applyNoiseTrigger,
    setApplyNoiseTrigger,
    noise,
    rawSamples,
    currentSignal,
    setNoisySamples,
    injected,
  } = useContext(SimulationContext);

  // toggle when all noise is false
  useEffect(() => {
    if (!noise.baseline && !noise.powerline && !noise.emg && !injected) {
      setApplyNoiseTrigger(false);
    }
  }, [noise, injected, setApplyNoiseTrigger]);

  const data = useMemo(() => {
    if (!rawSamples.length || !currentSignal.length) return [];
    if (!applyNoiseTrigger && !injected) return [];

    // Map currentSignal (Y values) back to time points
    const mappedSamples = rawSamples.map((s, i) => ({
      x: s.x,
      y: currentSignal[i] !== undefined ? currentSignal[i] : s.y
    }));

    const fsOriginal = inferFs(mappedSamples);
    const displayData = resampleForDisplay(mappedSamples, fsOriginal, originalFs);
    const limited = displayData.filter((p) => p.x <= time);
    // compute noise inline to avoid state setting in effect
    let y = limited.map((p) => p.y);
    if (noise.baseline) {
      y = addBaselineWander(y, originalFs);
    }
    if (noise.powerline) {
      y = addPowerlineNoise(y, originalFs);
    }
    if (noise.emg) {
      y = addMuscleNoise(y);
    }
    //console.log("limited", limited, limited.map((p, i) => ({ x: p.x, y: y[i] })));
    return limited.map((p, i) => ({ x: p.x, y: y[i] }));
  }, [applyNoiseTrigger, noise, time, originalFs, rawSamples, currentSignal, injected]);

  useEffect(() => {
    setNoisySamples(data);
  }, [
    applyNoiseTrigger,
    noise,
    time,
    originalFs,
    rawSamples,
    data,
    setNoisySamples,
  ]);

  const chartData = {
    datasets: [
      {
        label: "ECG Signal",
        data,
        borderColor: "red",
        borderWidth: 1,
        pointRadius: 0,
        tension: 0,
      },
    ],
  };

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
      <h3>
        ECG Signal{" "}
        <span>
          {" "}
          (Contiminated with{" "}
          {noise.baseline
            ? `Baseline Wander ${
                (noise.baseline && noise.powerline) ||
                (noise.baseline && noise.emg)
                  ? ","
                  : ""
              }`
            : ""}{" "}
          {noise.powerline ? `Powerline Noise${noise.emg ? "," : ""}` : ""}{" "}
          {noise.emg ? "Muscle Noise" : ""})
        </span>
      </h3>
      <div className={styles.graphContainer}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};
