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
  const getCommonOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    elements: { point: { radius: 0 } },
    plugins: {
      legend: { display: true, position: 'top' },
    },
    scales: {
      x: { type: 'linear', title: { display: true, text: 'Sample index (n)' } },
      y: { title: { display: true, text: title } }
    }
  });

  const getVerticalLineDataset = (xValue, color, label, maxY = 1, dashed = true) => ({
    label: label,
    data: [{ x: xValue, y: 0 }, { x: xValue, y: maxY }],
    borderColor: color,
    borderWidth: 2,
    borderDash: dashed ? [6, 3] : [],
    pointRadius: 0,
    showLine: true,
    hidden: quizMode && !quizSubmitted
  });

  // Chart 1: Error Power Data
  const errorPowerChartData = useMemo(() => {
    const lmsPeData = lmsResult?.Pe.map((v, i) => ({ x: i, y: v })) || [];
    const rlsPeData = rlsResult?.Pe.map((v, i) => ({ x: i, y: v })) || [];
    const thetaVal = (lmsResult?.theta || rlsResult?.theta) || 0;
    const thetaData = currentSignal.map((_, i) => ({ x: i, y: thetaVal || null }));

    // Find max Y for vertical lines
    const allY = [...lmsPeData.map(p => p.y), ...rlsPeData.map(p => p.y), thetaVal];
    const maxY = Math.max(0.1, ...allY) * 1.1;

    const datasets = [
      {
        label: "LMS Pₑ(n)",
        data: lmsPeData,
        borderColor: "#378ADD",
        borderWidth: 2,
        fill: false,
      },
      {
        label: "RLS Pₑ(n)",
        data: rlsPeData,
        borderColor: "#2a9d4e",
        borderWidth: 2,
        fill: false,
      },
      {
        label: "Threshold θ",
        data: thetaData,
        borderColor: "#E24B4A",
        borderWidth: 2,
        borderDash: [6, 3],
        fill: false,
      }
    ];

    if (!quizMode || quizSubmitted) {
      datasets.push(getVerticalLineDataset(changePoint, 'red', 'n*', maxY));
      if (lmsResult?.detectedAt > 0) datasets.push(getVerticalLineDataset(lmsResult.detectedAt, '#378ADD', 'LMS detect', maxY, false));
      if (rlsResult?.detectedAt > 0) datasets.push(getVerticalLineDataset(rlsResult.detectedAt, '#2a9d4e', 'RLS detect', maxY, false));
    }

    return { datasets };
  }, [lmsResult, rlsResult, currentSignal, changePoint, quizMode, quizSubmitted]);

  // Chart 2: Weight Trajectory Data
  const weightChartData = useMemo(() => {
    const activeResult = lastRun === 'RLS' ? rlsResult : lmsResult;
    const w1Data = activeResult?.weightsHistory.map(h => ({ x: h.n, y: h.w[0] })) || [];
    const w2Data = activeResult?.weightsHistory.map(h => ({ x: h.n, y: h.w[1] })) || [];
    const w3Data = activeResult?.weightsHistory.map(h => ({ x: h.n, y: h.w[2] })) || [];
    const w4Data = activeResult?.weightsHistory.map(h => ({ x: h.n, y: h.w[3] })) || [];

    // Find max/min Y for vertical lines
    const allY = [...w1Data.map(p => p.y), ...w2Data.map(p => p.y), ...w3Data.map(p => p.y), ...w4Data.map(p => p.y)];
    const maxY = Math.max(0.1, ...allY) * 1.1;
    const minY = Math.min(0, ...allY) * 1.1;

    const datasets = [
      { label: "w₁", data: w1Data, borderColor: "#7F77DD", borderWidth: 2 },
      { label: "w₂", data: w2Data, borderColor: "#D85A30", borderWidth: 2 },
      { label: "w₃", data: w3Data, borderColor: "#888780", borderWidth: 2 },
      { label: "w₄", data: w4Data, borderColor: "#378ADD", borderWidth: 2 }
    ];

    if (!quizMode || quizSubmitted) {
      datasets.push({
        label: 'n*',
        data: [{ x: changePoint, y: minY }, { x: changePoint, y: maxY }],
        borderColor: 'red',
        borderWidth: 2,
        borderDash: [6, 3],
        pointRadius: 0,
        showLine: true,
        hidden: quizMode && !quizSubmitted
      });
    }

    return { datasets };
  }, [lmsResult, rlsResult, lastRun, changePoint, quizMode, quizSubmitted]);

  // Chart 3: RLS Trace Data
  const traceChartData = useMemo(() => {
    const tData = rlsResult?.traceP.map((v, i) => ({ x: i, y: v })) || [];
    const maxY = Math.max(0.1, ...tData.map(p => p.y)) * 1.1;

    const datasets = [
      {
        label: "tr(P(n))",
        data: tData,
        borderColor: "#BA7517",
        borderWidth: 2,
        fill: false,
      }
    ];

    if (!quizMode || quizSubmitted) {
      datasets.push(getVerticalLineDataset(changePoint, 'red', 'n*', maxY));
    }

    return { datasets };
  }, [rlsResult, changePoint, quizMode, quizSubmitted]);

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
