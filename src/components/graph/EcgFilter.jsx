import { useMemo, useContext, useEffect } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./ecgFilter.module.css";
import { Line } from "react-chartjs-2";
import { filterSignalNLMS,filterSignalLMS, filterSignalRLS, calculateMSE } from "../../utils/filters";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

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
    cleanSignal,
    rawSamples,
    noisySamples,
    setFilteredSamples,
    setMetrics,
  } = useContext(SimulationContext);

  const filteredData = useMemo(() => {
    const inputSamples = noisySamples.length > 0 ? noisySamples : rawSamples;
    if (!inputSamples.length || !cleanSignal.length) return [];

    const fsOriginal = inferFs(inputSamples);
    const display = resampleForDisplay(inputSamples, fsOriginal, originalFs);
    const noisy = display.map((p) => p.y);
    const reference = cleanSignal.slice(0, noisy.length);

    let yFiltered = [];
    if (config.filterType === "NLMS") {
      yFiltered = filterSignalNLMS(noisy, reference, {
        filterOrder: config.filterOrder,
        stepSize: config.stepSize,
      });
    
    } else if (config.filterType === "LMS") {
      yFiltered = filterSignalLMS(noisy, reference, {
        filterOrder: config.filterOrder,
        stepSize: config.stepSize,
      }) ;}
      else {
      yFiltered = filterSignalRLS(noisy, reference, {
        filterOrder: config.filterOrder,
        forgettingFactor: config.forgettingFactor,
        regularization: config.regularization,
      });
    }

    const mse = calculateMSE(reference, yFiltered);
    setMetrics({ algorithm: config.filterType, order: config.filterOrder, mse: mse.toFixed(6) });

    const mapped = display.map((p, i) => ({ x: p.x, y: yFiltered[i] ?? 0 }));
    return mapped.filter((p) => p.x <= time);
  }, [time, originalFs, config, cleanSignal, rawSamples, noisySamples, setMetrics]);

  useEffect(() => {
    setFilteredSamples(filteredData);
  }, [filteredData, setFilteredSamples]);

  const chartData = {
    datasets: [
      {
        label: "Filtered ECG",
        data: filteredData,
        borderColor: "#2ecc71",
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    animation: false,
    parsing: false,
    plugins: { legend: { display: true } },
    scales: {
      x: { type: "linear", title: { display: true, text: "Time (s)" } },
      y: { title: { display: true, text: "Amplitude (mV)" } },
    },
  };

  return (
    <div className={styles.signalContainer}>
      <h3>
        ECG Signal (Filtered) <span>Algorithm: </span>
        <span>
             {config.filterType === "NLMS"
            ? `NLMS — μ=${config.stepSize} — M=${config.filterOrder}`
            : config.filterType === "LMS"
            ? `LMS — μ=${config.stepSize} — M=${config.filterOrder}`
            : `RLS — λ=${config.forgettingFactor} — M=${config.filterOrder}`}
        </span>
      </h3>
      <Line data={chartData} options={options} />
    </div>
  );
};
