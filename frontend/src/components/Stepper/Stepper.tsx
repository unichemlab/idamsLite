// src/components/Stepper/Stepper.tsx
import React from "react";
import styles from "./Stepper.module.css";

interface StepperProps {
  steps: string[];
  currentStep: number;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div className={styles.stepperContainer}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        return (
          <React.Fragment key={index}>
            <div
              className={
                styles.step +
                (isCompleted ? " " + styles.completed : "") +
                (isActive ? " " + styles.active : "")
              }
              tabIndex={0}
              aria-current={isActive ? "step" : undefined}
            >
              <div
                className={styles.circle}
                style={{
                  transition:
                    "box-shadow 0.3s, background 0.3s, color 0.3s, transform 0.3s",
                  boxShadow: isActive
                    ? "0 0 0 4px rgba(126,87,194,0.15)"
                    : isCompleted
                    ? "0 0 0 2px #28a74533"
                    : "0 2px 8px rgba(90,201,216,0.1)",
                  background: isActive
                    ? "linear-gradient(135deg, #fff 60%, #e3f6f9 100%)"
                    : isCompleted
                    ? "#28a745"
                    : "#aaa",
                  color: isActive ? "#4a148c" : "#fff",
                  cursor: "default",
                  transform: isActive ? "scale(1.08)" : "scale(1)",
                  opacity: isActive || isCompleted ? 1 : 0.5,
                  pointerEvents: "none",
                  marginTop:" 1rem",
                }}
              >
                <span
                  style={{
                    fontWeight: isActive ? 700 : 500,
                    fontSize: isActive ? "1.2em" : "1em",
                    transition: "color 0.3s, font-size 0.3s",
                  }}
                >
                  {index + 1}
                </span>
              </div>
              <span className={styles.label}>{step}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={
                  index < currentStep
                    ? `${styles.connector} ${styles.connectorActive}`
                    : styles.connector
                }
                style={{
                  transition: "background 0.3s",
                  cursor: "default",
                  
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Stepper;
