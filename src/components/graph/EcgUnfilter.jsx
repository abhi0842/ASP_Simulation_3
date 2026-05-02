import { useMemo, useContext } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./ecgUnfilter.module.css";
import { Line } from "react-chartjs-2";
import annotationPlugin from 'chartjs-plugin-annotation';
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
  Legend,
  annotationPlugin
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
  const { time, originalFs, generateECG, rawSamples, isChangeInjected } =
    useContext(SimulationContext);

  const { data, midpoint } = useMemo(() => {
    if (!rawSamples.length || !generateECG) return { data: [], midpoint: 0 };
    const fsOriginal = inferFs(rawSamples);
    const displayData = resampleForDisplay(rawSamples, fsOriginal, originalFs);
    const filtered = displayData.filter((p) => p.x <= time);
    const mid = filtered.length > 0 ? filtered[Math.floor(filtered.length / 2)].x : 0;
    return { data: filtered, midpoint: mid };
  }, [time, originalFs, generateECG, rawSamples]);

  const chartData = {
    datasets: [
      {
        label: "Signal x(n)",
        data,
        borderColor: "#3498db",
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    animation: true,
    parsing: false,
    plugins: {
      legend: {
        display: true,
      },
      annotation: {
        annotations: isChangeInjected ? {
          line1: {
            type: 'line',
            xMin: midpoint,
            xMax: midpoint,
            borderColor: 'gray',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              content: 'Change Point',
              enabled: true
            }
          }
        } : {}
      }
    },
    scales: {
      x: {
        type: "linear",
        title: {
          display: true,
          text: "Time (s)",
          font: {
            size: 13,
            weight: "bold",
          },
        },
        ticks: {
          font: {
            size: 13,
          },
        },
      },
      y: {
        title: {
          display: true,
          text: "Amplitude",
          font: {
            size: 13,
            weight: "bold",
          },
        },
        ticks: {
          font: {
            size: 12,
          },
        },
      },
    },
  };

  return (
    <div className={styles.signalContainer}>
      <h3>Signal (Unfiltered)</h3>
      <Line data={chartData} options={options} />
    </div>
  );
};
