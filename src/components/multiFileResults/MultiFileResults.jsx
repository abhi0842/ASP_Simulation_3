import { useContext } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./multiFileResults.module.css";

export const MultiFileResults = () => {
  const { multiResults, multiSignals } = useContext(SimulationContext);

  if (!multiSignals.ecg100 && !multiSignals.ecg200 && !multiSignals.ecg300) {
    return null;
  }

  const results = [
    { name: "ECG 100", key: "ecg100" },
    { name: "ECG 200", key: "ecg200" },
    { name: "ECG 300", key: "ecg300" },
  ];

  return (
    <div className={styles.resultsContainer}>
      <h3>Multi-File Analysis Results</h3>
      <div className={styles.resultsGrid}>
        {results.map((result) => {
          const resultData = multiResults[result.key];
          return (
            <div key={result.key} className={styles.resultCard}>
              <h4>{result.name}</h4>
              
              {resultData?.lms ? (
                <div className={styles.algorithmResult}>
                  <h5>LMS Results</h5>
                  <p>
                    <strong>Threshold (θ):</strong>{" "}
                    {resultData.lms.theta?.toFixed(4) ?? "N/A"}
                  </p>
                  <p>
                    <strong>Detection Index:</strong>{" "}
                    {resultData.lms.detectedAt >= 0
                      ? resultData.lms.detectedAt
                      : "No anomaly detected"}
                  </p>
                  <p>
                    <strong>Error Count:</strong> {resultData.lms.errors?.length ?? 0}
                  </p>
                </div>
              ) : (
                <p className={styles.noData}>LMS - Not run yet</p>
              )}

              {resultData?.rls ? (
                <div className={styles.algorithmResult}>
                  <h5>RLS Results</h5>
                  <p>
                    <strong>Threshold (θ):</strong>{" "}
                    {resultData.rls.theta?.toFixed(4) ?? "N/A"}
                  </p>
                  <p>
                    <strong>Detection Index:</strong>{" "}
                    {resultData.rls.detectedAt >= 0
                      ? resultData.rls.detectedAt
                      : "No anomaly detected"}
                  </p>
                  <p>
                    <strong>Peak Trace:</strong>{" "}
                    {resultData.rls.peakTrace
                      ? `${resultData.rls.peakTrace.val?.toFixed(4)} at index ${resultData.rls.peakTrace.idx}`
                      : "N/A"}
                  </p>
                </div>
              ) : (
                <p className={styles.noData}>RLS - Not run yet</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
