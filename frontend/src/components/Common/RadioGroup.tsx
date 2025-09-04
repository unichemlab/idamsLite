import React from "react";
import styles from "./RadioGroup.module.css";

interface RadioGroupProps {
  name: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
}) => {
  return (
    <div className={styles.radioGroup}>
      {options.map((option) => (
        <label key={option} className={styles.radioLabel}>
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className={styles.radioInput}
          />
          <span className={styles.customRadio}></span>
          {option}
        </label>
      ))}
    </div>
  );
};

export default RadioGroup;
