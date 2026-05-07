import { useContext, useEffect, useState, useRef } from "react";
import { SimulationContext } from "../../context/SimulationContext.jsx";
import styles from "./guidedModal.module.css";

export const GuidedModal = () => {
  const { 
    guideActive, setGuideActive, step, setStep, steps, 
    canProceed, setShowInstruction, showInstruction,
    instructionPanelRef
  } = useContext(SimulationContext);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowStyle, setArrowStyle] = useState({});
  const [arrowClass, setArrowClass] = useState("");
  const modalRef = useRef(null);
  
  const currentStep = steps[step];

  // Constants for UI Exclusion Zones
  const TOP_PANEL_HEIGHT = 60;
  const LEFT_PANEL_WIDTH = 280;

  const updatePosition = () => {
    if (!guideActive || !currentStep) return;

    const modalWidth = 320;
    const modalHeight = modalRef.current?.offsetHeight || 150;

    // Special Case: Choice/Welcome Step (Centered)
    if (currentStep.type === "choice") {
      setPosition({
        top: window.innerHeight / 2 - modalHeight / 2,
        left: window.innerWidth / 2 - modalWidth / 2
      });
      setArrowClass("");
      setArrowStyle({});
      return;
    }

    let target = null;
    if (currentStep.highlight === "instructionPanel" && instructionPanelRef.current) {
      target = instructionPanelRef.current;
    } else {
      const targetId = currentStep.highlight || currentStep.targetId;
      target = document.getElementById(targetId);
    }

    const container = modalRef.current?.parentElement;
    if (!target || !container) return;

    const rect = target.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();
    if (rect.width === 0) return;

    const OFFSET = currentStep.isDropdown ? 24 : 16;
    const isMobile = window.innerWidth < 768;

    // Smart Side Detection
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let chosenSide = isMobile ? 'bottom' : (currentStep.preferredPlacement || 'right');

    // Override for dropdowns
    if (currentStep.isDropdown && !isMobile) {
      chosenSide = spaceRight > spaceLeft ? 'right' : 'left';
    }

    // Dynamic Space Check
    const sides = {
      right: spaceRight,
      left: spaceLeft,
      bottom: spaceBelow,
      top: spaceAbove
    };
    
    if (chosenSide !== 'center') {
      const requiredSpace = (chosenSide === 'left' || chosenSide === 'right') ? modalWidth + OFFSET : modalHeight + OFFSET;
      if (sides[chosenSide] < requiredSpace) {
        // Fallback to side with most space
        chosenSide = Object.entries(sides).sort((a, b) => b[1] - a[1])[0][0];
      }
    }

    let top = 0;
    let left = 0;
    let arrowDir = "";

    // Calculate Coordinates relative to Viewport
    if (chosenSide === 'right') {
      left = rect.right + OFFSET;
      top = rect.top + rect.height / 2 - modalHeight / 2;
      arrowDir = styles.arrowLeft;
    } else if (chosenSide === 'left') {
      left = rect.left - modalWidth - OFFSET;
      top = rect.top + rect.height / 2 - modalHeight / 2;
      arrowDir = styles.arrowRight;
    } else if (chosenSide === 'top') {
      top = rect.top - modalHeight - OFFSET;
      left = rect.left + rect.width / 2 - modalWidth / 2;
      arrowDir = styles.arrowBottom;
    } else if (chosenSide === 'bottom') {
      top = rect.bottom + OFFSET;
      left = rect.left + rect.width / 2 - modalWidth / 2;
      arrowDir = styles.arrowTop;
    } else {
      left = window.innerWidth / 2 - modalWidth / 2;
      top = window.innerHeight / 2 - modalHeight / 2;
      arrowDir = "";
    }

    // --- Collision & Exclusion Zones ---
    if (top < TOP_PANEL_HEIGHT + 8) top = TOP_PANEL_HEIGHT + 8;
    
    // Convert to Container-Relative
    top = top - contRect.top;
    left = left - contRect.left;

    // Final Viewport Clamping
    const minL = 8;
    const maxL = contRect.width - modalWidth - 8;
    left = Math.max(minL, Math.min(left, maxL));
    
    const minT = 8;
    const maxT = container.scrollHeight - modalHeight - 8;
    top = Math.max(minT, Math.min(top, maxT));

    // Arrow Precision Alignment
    const targetRelCenterX = rect.left - contRect.left + (rect.width / 2);
    const targetRelCenterY = rect.top - contRect.top + (rect.height / 2);

    let aStyle = {};
    if (arrowDir === styles.arrowLeft || arrowDir === styles.arrowRight) {
      aStyle = { top: Math.max(15, Math.min(targetRelCenterY - top, modalHeight - 15)) };
    } else if (arrowDir === styles.arrowTop || arrowDir === styles.arrowBottom) {
      aStyle = { left: Math.max(15, Math.min(targetRelCenterX - left, modalWidth - 15)) };
    }

    setPosition({ top, left });
    setArrowClass(arrowDir);
    setArrowStyle(aStyle);
  };

  useEffect(() => {
    let timeoutId = null;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updatePosition, 150);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [guideActive, step]);

  useEffect(() => {
    if (guideActive) {
      if (currentStep?.highlight === "instructionPanel") {
        if (showInstruction && instructionPanelRef.current) {
          const rect = instructionPanelRef.current.getBoundingClientRect();
          if (rect.width > 0) updatePosition();
        }
      } else {
        updatePosition();
      }
    }
  }, [guideActive, step, showInstruction]);

  if (!guideActive || !currentStep) return null;

  const handleNext = () => {
    if (canProceed) {
      setStep((prev) => Math.min(steps.length - 1, prev + 1));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(0, prev - 1));
  };

  const handleYes = () => {
    setShowInstruction(true);
    setTimeout(() => {
      setStep(1);
    }, 400);
  };

  const handleSkip = () => {
    setGuideActive(false);
    setShowInstruction(false);
    setStep(0);
  };

  const isChoice = currentStep.type === "choice";

  return (
    <div 
      className={styles.modalOverlay} 
      style={{ 
        top: position.top, 
        left: position.left,
        opacity: guideActive ? 1 : 0,
        pointerEvents: guideActive ? 'auto' : 'none'
      }}
      ref={modalRef}
    >
      <div className={styles.modal}>
        {arrowClass && <div className={`${styles.arrow} ${arrowClass}`} style={arrowStyle} />}
        <button className={styles.closeIcon} onClick={handleSkip} aria-label="Close">×</button>
        <h2>{currentStep.title}</h2>
        <p>{currentStep.content}</p>
        <div className={styles.footer}>
          {isChoice ? (
            <div className={styles.buttonGroup}>
              <button className={styles.nextButton} onClick={handleYes}>Yes, show me</button>
              <button className={styles.cancelButton} onClick={handleSkip}>Skip</button>
            </div>
          ) : (
            <div className={styles.buttonGroup}>
              <div className={styles.stepCounter}>Step {step} of {steps.length - 1}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {step > 1 && (
                  <button className={styles.cancelButton} onClick={handleBack}>Back</button>
                )}
                {step < steps.length - 1 ? (
                  <button 
                    className={styles.nextButton} 
                    onClick={handleNext}
                    disabled={!canProceed}
                  >
                    {currentStep.requiredAction && !canProceed ? "Complete..." : "Next"}
                  </button>
                ) : (
                  <button className={styles.nextButton} onClick={handleSkip}>Finish</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
