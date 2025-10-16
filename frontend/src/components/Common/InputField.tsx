// src/components/Common/InputField.tsx
import React from "react";
import styles from "./InputField.module.css";

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  name,
  type = "text",
  placeholder,
  required,
  disabled = false,
}) => {
  return (
    <div className={styles.inputGroup}>
      <label className={styles.label}>{label}</label>
      <input
        className={styles.input}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
      />
    </div>
  );
};

export default InputField;
