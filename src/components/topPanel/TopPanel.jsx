import { useContext } from "react";
import styles from "./topPanel.module.css";
import { SimulationContext } from "../../context/SimulationContext.jsx";
const TopPanel = () => {
  const { 
    showInstruction, setShowInstruction, buttonRef,
    guideActive, setGuideActive
  } = useContext(SimulationContext);  

  const toggleInstruction = () => {
    setShowInstruction(!showInstruction);
  }

  const toggleGuide = () => {
    setGuideActive(!guideActive);
  }

  return (
    <div className={styles.Container}>
      <div className={styles.panelContainer}>
        <h1>
          Application and Usage of Filters on ECG Signal
        </h1>
        <div className={styles.buttonContainer}>
          <button
            id="guideButton"
            className={styles.panelButton}
            onClick={toggleGuide}
            style={{ marginRight: '100px', backgroundColor: guideActive ? '#2ecc71' : '' }}
          >
            <span className={styles.buttonIcon}>🚀</span>
            Guided Tutor
          </button>
          <button
            ref={buttonRef}
            className={styles.panelButton}
            onClick={toggleInstruction}
          >
            <span className={styles.buttonIcon}>ℹ️</span>
            Instruction
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopPanel;
