import { useContext } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./guidedModal.module.css";

export const GuidedModal = () => {
  const { step, setStep, steps } = useContext(SimulationContext);
  const currentStep = steps[step];

  if (!currentStep) return null;

  const handleNext = () => {
    if (!currentStep.requiredAction) {
      setStep((prev) => prev + 1);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>{currentStep.title}</h2>
        <p>{currentStep.content}</p>
        {!currentStep.requiredAction && step < steps.length - 1 && (
          <button className={styles.nextButton} onClick={handleNext}>
            Next
          </button>
        )}
        {step === steps.length - 1 && (
          <button className={styles.nextButton} onClick={() => setStep(0)}>
            Restart Lab
          </button>
        )}
      </div>
    </div>
  );
};
