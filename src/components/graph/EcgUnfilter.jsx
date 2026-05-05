import { useMemo, useContext } from "react";
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
  const { time, originalFs, setGenerateSignal, rawSamples, currentSignal, changePoint, injected } =
    useContext(SimulationContext);

  const data = useMemo(() => {
    if (!rawSamples.length || !currentSignal.length) return [];
    
    // Map currentSignal (Y values) back to time points
    const mappedSamples = rawSamples.map((s, i) => ({
      x: s.x,
      y: currentSignal[i] !== undefined ? currentSignal[i] : s.y
    }));

    const fsOriginal = inferFs(mappedSamples);
    const displayData = resampleForDisplay(mappedSamples, fsOriginal, originalFs);
    return displayData.filter((p) => p.x <= time);
  }, [time, originalFs, rawSamples, currentSignal]);


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
