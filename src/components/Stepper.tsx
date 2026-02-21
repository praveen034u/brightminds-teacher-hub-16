import React from "react";
import styles from "../styles/PracticeMode.module.css";

interface StepperProps {
  steps: string[];
  currentStep: number;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => (
  <div className={styles.stepper}>
    {steps.map((step, idx) => (
      <div
        key={step}
        className={
          idx === currentStep
            ? styles.stepActive
            : idx < currentStep
            ? styles.stepDone
            : styles.step
        }
      >
        <span className={styles.stepNumber}>{idx + 1}</span>
        <span className={styles.stepLabel}>{step}</span>
      </div>
    ))}
  </div>
);

export default Stepper;
