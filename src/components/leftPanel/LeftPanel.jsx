import { useContext } from "react";
import styles from "./leftPanel.module.css";
import { EcgUnfilter } from "../graph/EcgUnfilter.jsx";
import { EcgFilter } from "../graph/EcgFilter.jsx";
import { EcgNoisy } from "../graph/EcgNoisy.jsx";
import { SimulationContext } from "../../context/SimulationContext.jsx";
import { EcgUnfilteredPSD } from "../graph/EcgUnfilteredPSD.jsx";
import { EcgFilteredPSD } from "../graph/EcgFilteredPSD.jsx";

export const LeftPanel = () => {
  const { generateECG, filteredECG } =
    useContext(SimulationContext);
  return (
    <div className={styles.leftPanelContainer}>
      <div className={styles.container}>
        <div>{generateECG && !filteredECG && <EcgUnfilter />}</div>
        <div>{filteredECG && <EcgFilter />}</div>
      </div>
    </div>
  );
};
