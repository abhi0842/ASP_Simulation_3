import { useContext, useEffect, useRef } from "react";
import styles from "./home.module.css";
import TopPanel from "../../components/topPanel/TopPanel.jsx";
import { Instruction } from "../../components/instruction/Instruction.jsx";
import { SimulationContext } from "../../context/SimulationContext.jsx";
import { LeftPanel } from "../../components/leftPanel/LeftPanel.jsx";
import { RightPanel } from "../../components/rightPanel/RightPanel.jsx";
import { GuidedModal } from "../../components/guidedModal/GuidedModal.jsx";
import { DebugPanel } from "../../components/debugPanel/DebugPanel.jsx";
import { StatusNotification } from "../../components/statusNotification/StatusNotification.jsx";

export const Home = () => {
  const { showInstruction, setShowInstruction, buttonRef, instructionPanelRef } =
    useContext(SimulationContext);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        instructionPanelRef.current &&
        !instructionPanelRef.current.contains(event.target)
      ) {
        if (buttonRef.current && !buttonRef.current.contains(event.target)) {
          setShowInstruction(false); // close the panel
        }
      }
    };
    if (showInstruction) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showInstruction, setShowInstruction, buttonRef]);

  return (
    <div className={styles.grandContainer}>
      <div className={styles.parentContainer}>
        <div className={styles.topContainer}>
          <TopPanel />
        </div>
        {/* Middle Container:- simulation area */}
        <div className={styles.middleContainer}>
          {showInstruction && (
            <div id="instructionPanel" ref={instructionPanelRef} className={styles.instructionContainer}>
              <Instruction />
            </div>
          )}
          <LeftPanel className={styles.leftPanelContainer} />
          <RightPanel className={styles.rightPanelContainer} />
        </div>
        <div className={styles.footerContainer}>
          ©Copyright 2025 Virtual Labs, IIT Roorkee
        </div>
        <GuidedModal />
        <DebugPanel />
        <StatusNotification />
      </div>
    </div>
  );
};
