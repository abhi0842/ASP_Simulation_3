import { useContext, useState, useEffect, useMemo } from "react";
import styles from "./leftPanel.module.css";
import { EcgUnfilter } from "../graph/EcgUnfilter.jsx";
import { EcgNoisy } from "../graph/EcgNoisy.jsx";
import { SimulationContext } from "../../context/SimulationContext.jsx";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Title
} from "chart.js";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Title);

export const LeftPanel = () => {
  const {
    currentSignal,
    lmsResult,
    rlsResult,
    changePoint,
    config,
    quizMode,
    quizGuess,
    setQuizGuess,
    quizSubmitted,
    setQuizSubmitted,
  } = useContext(SimulationContext);

  const [lastRun, setLastRun] = useState(null); // 'LMS' or 'RLS'

  useEffect(() => {
    if (rlsResult) setLastRun('RLS');
    else if (lmsResult) setLastRun('LMS');
  }, [lmsResult, rlsResult]);

  const quizError = quizSubmitted ? Math.abs(Number(quizGuess) - changePoint) : null;

  // Common options for Chart.js
  const getCommonOptions = (title, showMarkers = true) => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    elements: { point: { radius: 0 } },
    plugins: {
      legend: { display: true, position: 'top' },
      annotation: {
        annotations: showMarkers && (!quizMode || quizSubmitted) ? {
          changeLine: {
            type: 'line',
            xMin: changePoint,
            xMax: changePoint,
            borderColor: 'red',
            borderWidth: 2,
            borderDash: [6, 3],
            label: { content: 'n*', enabled: true, position: 'start' }
          },
          lmsDetect: lmsResult?.detectedAt > 0 ? {
            type: 'line',
            xMin: lmsResult.detectedAt,
            xMax: lmsResult.detectedAt,
            borderColor: '#378ADD',
            borderWidth: 2,
            label: { content: 'LMS detect', enabled: true, position: 'end' }
          } : undefined,
          rlsDetect: rlsResult?.detectedAt > 0 ? {
            type: 'line',
            xMin: rlsResult.detectedAt,
            xMax: rlsResult.detectedAt,
            borderColor: '#2a9d4e',
            borderWidth: 2,
            label: { content: 'RLS detect', enabled: true, position: 'end' }
          } : undefined,
        } : {}
      }
    },
    scales: {
      x: { type: 'linear', title: { display: true, text: 'Sample index (n)' } },
      y: { title: { display: true, text: title } }
    }
  });

  // Chart 1: Error Power Data
  const errorPowerChartData = {
    datasets: [
      {
        label: "LMS Pₑ(n)",
        data: lmsResult?.Pe.map((v, i) => ({ x: i, y: v })) || [],
        borderColor: "#378ADD",
        borderWidth: 2,
        fill: false,
      },
      {
        label: "RLS Pₑ(n)",
        data: rlsResult?.Pe.map((v, i) => ({ x: i, y: v })) || [],
        borderColor: "#2a9d4e",
        borderWidth: 2,
        fill: false,
      },
      {
        label: "Threshold θ",
        data: currentSignal.map((_, i) => ({ x: i, y: (lmsResult?.theta || rlsResult?.theta) || null })),
        borderColor: "#E24B4A",
        borderWidth: 2,
        borderDash: [6, 3],
        fill: false,
      }
    ]
  };

  // Chart 2: Weight Trajectory Data
  const activeResult = lastRun === 'RLS' ? rlsResult : lmsResult;
  const weightChartData = {
    datasets: [
      { label: "w₁", data: activeResult?.weightsHistory.map(h => ({ x: h.n, y: h.w[0] })) || [], borderColor: "#7F77DD", borderWidth: 2 },
      { label: "w₂", data: activeResult?.weightsHistory.map(h => ({ x: h.n, y: h.w[1] })) || [], borderColor: "#D85A30", borderWidth: 2 },
      { label: "w₃", data: activeResult?.weightsHistory.map(h => ({ x: h.n, y: h.w[2] })) || [], borderColor: "#888780", borderWidth: 2 },
      { label: "w₄", data: activeResult?.weightsHistory.map(h => ({ x: h.n, y: h.w[3] })) || [], borderColor: "#378ADD", borderWidth: 2 }
    ]
  };

  // Chart 3: RLS Trace Data
  const traceChartData = {
    datasets: [
      {
        label: "tr(P(n))",
        data: rlsResult?.traceP.map((v, i) => ({ x: i, y: v })) || [],
        borderColor: "#BA7517",
        borderWidth: 2,
        fill: false,
      }
    ]
  };

  return (
    <div className={styles.leftPanelContainer}>
      <div className={styles.container}>
        {/* Existing Charts */}
        <EcgUnfilter />
        <EcgNoisy />

        {/* Quiz Mode Banner */}
        {quizMode && (
          <>
            <div className={styles.quizBanner}>
              Quiz Mode Active — Identify the change-point from the error power curve. Enter your answer below.
            </div>
            <div className={styles.quizInputRow}>
              <input 
                type="number" 
                placeholder="sample index" 
                value={quizGuess}
                onChange={(e) => setQuizGuess(e.target.value)}
              />
              <button onClick={() => setQuizSubmitted(true)}>Submit Answer</button>
            </div>
            {quizSubmitted && (
              <div className={`${styles.quizResult} ${quizError < 30 ? styles.success : styles.error}`}>
                Your guess: {quizGuess}. Actual: {changePoint}. Error: {quizError} samples.
              </div>
            )}
          </>
        )}

        {/* Metrics Strip */}
        <div className={styles.metricsStrip}>
          <div className={styles.metricCard}>
            <h4>LMS ADAPTIVE PREDICTOR</h4>
            <div className={styles.metricRow}><span>Detection lag:</span><span className={styles.metricValue}>{lmsResult?.detectedAt > 0 ? lmsResult.detectedAt - changePoint : "—"} samples</span></div>
            <div className={styles.metricRow}><span>Convergence est.:</span><span className={styles.metricValue}>τ ≈ {lmsResult ? (1 / (4 * config.stepSize * config.filterOrder * 0.1)).toFixed(0) : "—"} samples</span></div>
            <div className={styles.metricRow}><span>False alarms:</span><span className={styles.metricValue}>{lmsResult ? "0" : "—"}</span></div>
            <div className={styles.metricRow}><span>Filter order M:</span><span className={styles.metricValue}>{config.filterOrder}</span></div>
            <div className={styles.metricRow}><span>Step size µ:</span><span className={styles.metricValue}>{config.stepSize}</span></div>
          </div>
          <div className={styles.metricCard}>
            <h4>RLS ADAPTIVE PREDICTOR</h4>
            <div className={styles.metricRow}><span>Detection lag:</span><span className={styles.metricValue}>{rlsResult?.detectedAt > 0 ? rlsResult.detectedAt - changePoint : "—"} samples</span></div>
            <div className={styles.metricRow}><span>Effective memory:</span><span className={styles.metricValue}>N_eff = {rlsResult ? (1 / (1 - config.forgettingFactor)).toFixed(0) : "—"} samples</span></div>
            <div className={styles.metricRow}><span>Re-convergence:</span><span className={styles.metricValue}>≈ 2M = {config.filterOrder * 2} steps</span></div>
            <div className={styles.metricRow}><span>tr(P) peak:</span><span className={styles.metricValue}>{rlsResult ? `${rlsResult.peakTrace.val.toFixed(2)} at n=${rlsResult.peakTrace.idx}` : "—"}</span></div>
            <div className={styles.metricRow}><span>Forgetting factor λ:</span><span className={styles.metricValue}>{config.forgettingFactor}</span></div>
          </div>
        </div>

        {/* New Chart 1: Error Power */}
        <div className={styles.chartCard}>
          <h3>Error Power Pₑ(n) — Non-Stationarity Detection</h3>
          <div style={{ height: '250px' }}>
            <Line data={errorPowerChartData} options={getCommonOptions('Error power')} />
          </div>
        </div>

        {/* New Chart 2: Weight Trajectory */}
        <div className={styles.chartCard}>
          <h3>Weight Vector Trajectory w(n)</h3>
          <div style={{ height: '250px' }}>
            <Line data={weightChartData} options={getCommonOptions('Weight value')} />
          </div>
        </div>

        {/* New Chart 3: RLS Trace */}
        {rlsResult && (
          <div className={styles.chartCard}>
            <h3>RLS Matrix Trace tr(P(n)) — Uncertainty Indicator</h3>
            <div style={{ height: '250px' }}>
              <Line data={traceChartData} options={getCommonOptions('tr(P(n))')} />
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>
              Peak = {rlsResult.peakTrace.val.toFixed(2)} at n={rlsResult.peakTrace.idx}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
