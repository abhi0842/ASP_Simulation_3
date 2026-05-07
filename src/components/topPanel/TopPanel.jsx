import { useContext } from "react";
import styles from "./topPanel.module.css";
import { SimulationContext } from "../../context/SimulationContext.jsx";
const TopPanel = () => {
  const { 
    showInstruction, setShowInstruction, buttonRef,
    guideActive, setGuideActive, setStep
  } = useContext(SimulationContext);  

  const toggleInstruction = () => {
    setShowInstruction(!showInstruction);
  }

  const toggleGuide = () => {
    if (!guideActive) {
      // Just activate the guide at step 0 (Welcome)
      setStep(0);
      setGuideActive(true);
    } else {
      setGuideActive(false);
      setShowInstruction(false);
      setStep(0);
    }
  }

  return (
    <div className={styles.Container}>
      <div className={styles.panelContainer}>
        <h1>
          Application and Usage of Filters on ECG Signal
        </h1>
        <div className={styles.buttonContainer}>
          <button
            ref={buttonRef}
            className={styles.panelButton}
            onClick={toggleInstruction}
          >
            <span className={styles.buttonIcon}>ℹ️</span>
            Instruction
          </button>
          <button
            id="guideButton"
            className={styles.panelButton}
            onClick={toggleGuide}
            style={{ backgroundColor: guideActive ? '#2ecc71' : '' }}
          >
            <span className={styles.buttonIcon}>🚀</span>
            Guided Tutor
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopPanel;
