import { useContext, useEffect, useState, useRef } from "react";
import { SimulationContext } from "../../context/SimulationContext.jsx";
import styles from "./guidedModal.module.css";

export const GuidedModal = () => {
  const { guideActive, setGuideActive, step, setStep, steps, canProceed } = useContext(SimulationContext);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowStyle, setArrowStyle] = useState({});
  const [arrowClass, setArrowClass] = useState("");
  const modalRef = useRef(null);
  const containerRef = useRef(null);
  
  const currentStep = steps[step];

  useEffect(() => {
    if (!guideActive || !currentStep) return;

    const updatePosition = () => {
      const targetId = currentStep.highlight || currentStep.targetId;
      const target = document.getElementById(targetId);
      const container = modalRef.current?.parentElement;
      
      if (!target || !container) {
        setPosition({ top: 100, left: 50 });
        setArrowClass("");
        setArrowStyle({});
        return;
      }

      const rect = target.getBoundingClientRect();
      const contRect = container.getBoundingClientRect();
      const modalWidth = 320;
      const modalHeight = modalRef.current?.offsetHeight || 150;
      const OFFSET = 16;

      // Smart side detection - calculate available space
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft = rect.left;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      const preferredPlacement = currentStep.preferredPlacement || 'right';
      let chosenSide = preferredPlacement;

      // Fallback to side with most space if preferred side is too cramped
      if (preferredPlacement === 'right' && spaceRight < modalWidth + OFFSET) {
        if (spaceLeft > spaceRight) chosenSide = 'left';
      } else if (preferredPlacement === 'left' && spaceLeft < modalWidth + OFFSET) {
        if (spaceRight > spaceLeft) chosenSide = 'right';
      } else if (preferredPlacement === 'top' && spaceAbove < modalHeight + OFFSET) {
        if (spaceBelow > spaceAbove) chosenSide = 'bottom';
      } else if (preferredPlacement === 'bottom' && spaceBelow < modalHeight + OFFSET) {
        if (spaceAbove > spaceBelow) chosenSide = 'top';
      }

      let top = 0;
      let left = 0;
      let arrowDir = "";

      // Positioning and arrow selection based on chosen side
      if (chosenSide === 'right') {
        left = rect.right + OFFSET;
        top = rect.top + (rect.height / 2) - (modalHeight / 2);
        arrowDir = styles.arrowLeft;
      } else if (chosenSide === 'left') {
        left = rect.left - modalWidth - OFFSET;
        top = rect.top + (rect.height / 2) - (modalHeight / 2);
        arrowDir = styles.arrowRight;
      } else if (chosenSide === 'top') {
        top = rect.top - modalHeight - OFFSET;
        left = rect.left + (rect.width / 2) - (modalWidth / 2);
        arrowDir = styles.arrowBottom;
      } else if (chosenSide === 'bottom') {
        top = rect.bottom + OFFSET;
        left = rect.left + (rect.width / 2) - (modalWidth / 2);
        arrowDir = styles.arrowTop;
      } else if (chosenSide === 'center') {
        left = window.innerWidth / 2 - modalWidth / 2;
        top = window.innerHeight / 2 - modalHeight / 2;
        arrowDir = "";
      }

      // Convert to container-relative coordinates
      top = top - contRect.top;
      left = left - contRect.left;

      // Viewport bounds check - clamp within container
      const minLeft = 8;
      const maxLeft = contRect.width - modalWidth - 8;
      left = Math.max(minLeft, Math.min(left, maxLeft));
      
      const minTop = 8;
      const maxTop = container.scrollHeight - modalHeight - 8;
      top = Math.max(minTop, Math.min(top, maxTop));

      // Accurate arrow pointer alignment
      const targetRelCenterX = rect.left - contRect.left + (rect.width / 2);
      const targetRelCenterY = rect.top - contRect.top + (rect.height / 2);

      let aStyle = {};
      if (arrowDir === styles.arrowLeft || arrowDir === styles.arrowRight) {
        const arrowTopOffset = targetRelCenterY - top;
        aStyle = { top: Math.max(15, Math.min(arrowTopOffset, modalHeight - 15)) };
      } else if (arrowDir === styles.arrowTop || arrowDir === styles.arrowBottom) {
        const arrowLeftOffset = targetRelCenterX - left;
        aStyle = { left: Math.max(15, Math.min(arrowLeftOffset, modalWidth - 15)) };
      }

      setPosition({ top, left });
      setArrowClass(arrowDir);
      setArrowStyle(aStyle);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, [guideActive, step, currentStep]);

  if (!guideActive || !currentStep) return null;

  const handleNext = () => {
    if (canProceed) {
      setStep((prev) => Math.min(steps.length - 1, prev + 1));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(0, prev - 1));
  };

  const handleClose = () => {
    setGuideActive(false);
    setStep(0);
  };

  const isWelcome = currentStep.type === "welcome";

  return (
    <div 
      className={styles.modalOverlay} 
      style={{ top: position.top, left: position.left }}
      ref={modalRef}
    >
      <div className={styles.modal}>
        <div className={`${styles.arrow} ${arrowClass}`} style={arrowStyle} />
        <button className={styles.closeIcon} onClick={handleClose} aria-label="Close">×</button>
        <h2>{currentStep.title}</h2>
        <p>{currentStep.content}</p>
        <div className={styles.footer}>
          {isWelcome ? (
            <div className={styles.buttonGroup}>
              <button className={styles.nextButton} onClick={handleNext}>Yes, Start</button>
              <button className={styles.cancelButton} onClick={handleClose}>No, thanks</button>
            </div>
          ) : (
            <div className={styles.buttonGroup}>
              {step > 0 && (
                <button className={styles.cancelButton} onClick={handleBack}>Back</button>
              )}
              {step < steps.length - 1 ? (
                <button 
                  className={styles.nextButton} 
                  onClick={handleNext}
                  disabled={!canProceed}
                >
                  {currentStep.requiredAction && !canProceed ? "Complete step..." : "Next"}
                </button>
              ) : (
                <button className={styles.nextButton} onClick={handleClose}>Finish</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
