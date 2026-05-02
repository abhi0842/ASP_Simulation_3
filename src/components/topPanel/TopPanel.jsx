import { useContext } from "react";
import styles from "./topPanel.module.css";
import { SimulationContext } from "../../context/SimulationContext.jsx";
const TopPanel = () => {
  const { 
    showInstruction, setShowInstruction, buttonRef,
    quizMode, setQuizMode
  } = useContext(SimulationContext);  

  const toggleInstruction = () => {
    setShowInstruction(!showInstruction);
  }

  const toggleQuizMode = () => {
    setQuizMode(!quizMode);
  }

  return (
    <div className={styles.Container}>
      <div className={styles.panelContainer}>
        <h1>
          Application and Usage of Filters on ECG Signal
        </h1>
        <div className={styles.buttonContainer}>
          <button
            className={styles.panelButton}
            onClick={toggleQuizMode}
            style={{ marginRight: '10px', backgroundColor: quizMode ? '#f1c40f' : '' }}
          >
            <span className={styles.buttonIcon}>🎓</span>
            Quiz Mode
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
