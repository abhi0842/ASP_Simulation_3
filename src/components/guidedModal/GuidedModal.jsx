import { useContext } from "react";
import { SimulationContext } from "../../context/SimulationContext.jsx";
import styles from "./guidedModal.module.css";

export const GuidedModal = () => {
  const { guideActive, setGuideActive, step, setStep, steps, canProceed } = useContext(SimulationContext);
  
  if (!guideActive) return null;

  const currentStep = steps[step];
  if (!currentStep) return null;

  const handleNext = () => {
    if (canProceed) {
      setStep((prev) => Math.min(steps.length - 1, prev + 1));
    }
  };

  const handleClose = () => {
    setGuideActive(false);
    setStep(0);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <button className={styles.closeIcon} onClick={handleClose}>×</button>
        <h2>{currentStep.title}</h2>
        <p>{currentStep.content}</p>
        <div className={styles.footer}>
          {step < steps.length - 1 ? (
            <button 
              className={styles.nextButton} 
              onClick={handleNext}
              disabled={!canProceed}
            >
              {currentStep.requiredAction && !canProceed ? "Perform required action..." : "Next"}
            </button>
          ) : (
            <button className={styles.nextButton} onClick={handleClose}>
              Restart Lab
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
