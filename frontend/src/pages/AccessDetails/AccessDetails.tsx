import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./AccessDetails.module.css";
import Stepper from "../../components/Stepper/Stepper";
import { formSteps } from "../../data/formFields";
import DynamicForm from "../../components/DynamicForm/DynamicForm";
import { useFormContext } from "../../context/FormContext";

const AccessDetails: React.FC = () => {
  const navigate = useNavigate();
  const { data, setData } = useFormContext();
  const [values, setValues] = useState<Record<string, any>>(data);

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setData((prev) => ({ ...prev, ...values }));
    navigate("/review-submit");
  };

  // For demo: inject hardcoded options for all fields to simulate DB/API
  const stepConfig = {
    ...formSteps[1],
    fields: formSteps[1].fields.map((field) => {
      if (field.name === "accessType") {
        return {
          ...field,
          type: "select" as const,
          options: ["SAP", "Email", "VPN", "Network Drive", "HRMS"],
          required: true,
        };
      }
      if (field.name === "accessLevel") {
        return {
          ...field,
          type: "select" as const,
          options: ["Read", "Write", "Admin", "Custom"],
          required: true,
        };
      }
      if (field.name === "justification") {
        return {
          ...field,
          type: "select" as const,
          options: [
            "Project Requirement",
            "Role Change",
            "New Joiner",
            "Temporary Access",
            "Other",
          ],
          required: true,
        };
      }
      return { ...field, required: true };
    }),
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>PharmaCorp</h1>
        <p className={styles.subtitle}>User Access Management System</p>
        <div style={{ marginBottom: "2rem", marginTop: "4rem", borderBottom: "1px solid #ccc"  }}>
          <Stepper steps={formSteps.map((s) => s.title)} currentStep={1} />
        </div>
        <div className={styles.formTitleCenter}>
        <h2 className={styles.formTitle}>System {stepConfig.title}</h2>
         <p className={styles.subTitle}>{stepConfig.subTitle}</p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit} autoComplete="on">
          <DynamicForm
            fields={stepConfig.fields}
            values={values}
            onChange={handleChange}
          />
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate("/")}
            >
              Back
            </button>
            <button type="submit" className={styles.continueButton}>
              Continue 
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccessDetails;
