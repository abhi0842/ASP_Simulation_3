import { useContext, useEffect, useState, useRef } from "react";
import { SimulationContext } from "../../context/SimulationContext.jsx";
import styles from "./guidedModal.module.css";

export const GuidedModal = () => {
  const { guideActive, setGuideActive, step, setStep, steps, canProceed } = useContext(SimulationContext);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowClass, setArrowClass] = useState("");
  const modalRef = useRef(null);
  
  const currentStep = steps[step];

  useEffect(() => {
    if (!guideActive || !currentStep) return;

    const updatePosition = () => {
      const targetId = currentStep.highlight || currentStep.targetId;
      const target = document.getElementById(targetId);
      
      if (!target) {
        // Default position if no target (e.g., center)
        setPosition({ top: 100, left: window.innerWidth / 2 - 160 });
        setArrowClass("");
        return;
      }

      const rect = target.getBoundingClientRect();
      const modalWidth = 320;
      const modalHeight = modalRef.current?.offsetHeight || 150;
      const spacing = 15;

      // Calculate position relative to document (absolute positioning)
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      let top = 0;
      let left = 0;
      let arrow = "";

      if (currentStep.type === "welcome") {
        top = rect.bottom + scrollY + spacing;
        left = rect.left + scrollX + (rect.width / 2) - (modalWidth / 2);
        arrow = styles.arrowUp;
      } else if (currentStep.position === "left") {
        top = rect.top + scrollY + (rect.height / 2) - (modalHeight / 2);
        left = rect.left + scrollX - modalWidth - spacing;
        arrow = styles.arrowRight;
      } else if (currentStep.position === "above") {
        top = rect.top + scrollY - modalHeight - spacing;
        left = rect.left + scrollX + (rect.width / 2) - (modalWidth / 2);
        arrow = styles.arrowDown;
      } else {
        // Default to right
        top = rect.top + scrollY + (rect.height / 2) - (modalHeight / 2);
        left = rect.right + scrollX + spacing;
        arrow = styles.arrowLeft;
      }

      // Viewport bounds check (using scroll positions for absolute bounds)
      const minLeft = 10 + scrollX;
      const maxLeft = window.innerWidth + scrollX - modalWidth - 10;
      left = Math.max(minLeft, Math.min(left, maxLeft));
      
      const minTop = 10 + scrollY;
      const maxTop = document.documentElement.scrollHeight - modalHeight - 10;
      top = Math.max(minTop, Math.min(top, maxTop));

      setPosition({ top, left });
      setArrowClass(arrow);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [guideActive, step, currentStep]);

  if (!guideActive) return null;
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

  const isWelcome = currentStep.type === "welcome";

  return (
    <div className={styles.modalOverlay} style={{ top: position.top, left: position.left }}>
      <div ref={modalRef} className={`${styles.modal} ${arrowClass}`}>
        <button className={styles.closeIcon} onClick={handleClose} aria-label="Close tutorial">×</button>
        <h2>{currentStep.title}</h2>
        <p>{currentStep.content}</p>
        <div className={styles.footer}>
          {isWelcome ? (
            <div className={styles.buttonGroup}>
              <button className={styles.nextButton} onClick={handleNext}>Yes, Start</button>
              <button className={styles.cancelButton} onClick={handleClose}>No, thanks</button>
            </div>
          ) : (
            <>
              {step < steps.length - 1 ? (
                <button 
                  className={styles.nextButton} 
                  onClick={handleNext}
                  disabled={!canProceed}
                >
                  {currentStep.requiredAction && !canProceed ? "Complete step..." : "Next"}
                </button>
              ) : (
                <button className={styles.nextButton} onClick={handleClose}>
                  Finish
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
