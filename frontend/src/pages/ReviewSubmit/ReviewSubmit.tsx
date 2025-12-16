import React, { useEffect, useState, useRef } from "react";
import { useFormContext } from "../../context/FormContext";
import { checkUserActiveStatus } from "../../utils/zingApi";
import { useNavigate } from "react-router-dom";
import styles from "./ReviewSubmit.module.css";
import Stepper from "../../components/Stepper/Stepper";
import { formSteps, FormField } from "../../data/formFields";

const ReviewSubmit: React.FC = () => {
  const { data } = useFormContext();
  const navigate = useNavigate();
  const [userStatus, setUserStatus] = useState<"active" | "inactive" | "checking">("checking");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isValidFile = (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png"
    ];
    return allowedTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => isValidFile(file));
    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => isValidFile(file));
    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const recordData: Record<string, any> = data as Record<string, any>;

  useEffect(() => {
    const checkStatus = async () => {
      setUserStatus("checking");
      const status = await checkUserActiveStatus(data.employeeCode || "");
      setUserStatus(status);
    };
    checkStatus();
    // eslint-disable-next-line
  }, [data.employeeCode]);

  useEffect(() => {
    const trainingStatus = recordData["trainingStatus"]?.toLowerCase();
    const isTrainingCompleted = trainingStatus?.includes("yes");
    if (isTrainingCompleted) {
      setIsSubmitDisabled(uploadedFiles.length === 0);
    } else {
      setIsSubmitDisabled(false);
    }
  }, [uploadedFiles, recordData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trainingStatus = recordData["trainingStatus"]?.toLowerCase();
    const isTrainingCompleted = trainingStatus?.includes("yes");
    if (isTrainingCompleted && uploadedFiles.length === 0) {
      setSubmitError("File upload is required when training is completed.");
      setIsSubmitDisabled(true);
      return;
    }
    setSubmitError("Please upload at least one file.");
    setIsSubmitDisabled(false);
    navigate("/generate-credentials");
  };


  const handleRemoveFile = (index: number) => {
  setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
};


  const reviewFields: FormField[] = formSteps.flatMap((step) => step.fields);
  const credentialFields = [
    { name: "userId", label: "User ID" },
    { name: "password", label: "Generated Password" },
    { name: "requestId", label: "Request ID" },
    { name: "approvedAt", label: "Approved At" },
    { name: "validUntil", label: "Valid Until" },
  ];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>PharmaCorp</h1>
      <p className={styles.subtitle}>User Request Management System</p>
      <div style={{ marginBottom: "2rem" , marginTop: "4rem", borderBottom: "1px solid #ccc" }}>
        <Stepper
          steps={formSteps.map((s: { title: string }) => s.title)}
          currentStep={2}
        />
      </div>
      <div className={styles.formTitleCenter}>
        <h2 className={styles.formTitle}> Review & Submit</h2>
         <p className={styles.subtitle1}>Review your information and provide additional details.</p>
        </div>
      <form className={styles.card} onSubmit={handleSubmit}>
        {userStatus === "inactive" && (
          <div style={{ color: "#c00", marginBottom: 12, fontWeight: 500 }}>
            Warning: This user is marked as <b>inactive</b> in Zing HR. You cannot submit a request for an inactive user.
          </div>
        )}
      
        {Array.isArray(recordData.logs) && recordData.logs.length > 0 && (
          <div style={{ marginBottom: "1.2rem" }}>
           
             <p><strong>Request Type:</strong> {data.requestType || "Not provided"}</p>
          </div>
        )}
       
        {reviewFields.map((field: FormField) => (
          <div className={styles.reviewItem} key={field.name}>
            <strong>{field.label}:</strong>{" "}
            {Array.isArray(recordData[field.name]) ? (
              <ul className={styles.list}>
                {recordData[field.name].map((v: string) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            ) : (
              recordData[field.name] || <span style={{ color: "#aaa" }}>-</span>
            )}
          </div>
        ))}
        {credentialFields.map((field) =>
          recordData[field.name] ? (
            <div className={styles.reviewItem} key={field.name}>
              <strong>{field.label}:</strong>{" "}
              {field.name === "password" ? "••••••••" : recordData[field.name]}
            </div>
          ) : null
        )}
        <div className={styles.attachmentSection}>
          <label className={styles.sectionLabel}>Document Attachment</label>
          
          <div
            className={styles.uploadBox}
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
            onClick={handleBrowseClick}
          >
            <div className={styles.folderIcon} />
            <p>
              Drag and drop files here or{" "}
              <span className={styles.browse}>browse</span>
            </p>
            <p className={styles.uploadHint}>
              Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
            </p>
            {uploadedFiles.length > 0 && (
  <ul className={styles.fileList}>
    {uploadedFiles.map((file, idx) => (
      <li key={idx} className={styles.fileItem}>
        📄 {file.name}
        <button
          type="button"
          onClick={() => handleRemoveFile(idx)}
          className={styles.removeButton}
        >
          ✕
        </button>
      </li>
    ))}
  </ul>
)}

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
            
          </div>
    {submitError && <p className={styles.errorText}>{submitError}</p>}


        </div>
       
        <div className={styles.remarksSection}>
          <label htmlFor="remarks" className={styles.sectionLabel}>Remarks</label>
          <textarea
            id="remarks"
            className={styles.remarksInput}
            placeholder="Additional comments, special instructions, or business justification..."
          />
        </div>
        <div className={styles.checkboxWrapper}>
          <input type="checkbox" id="certify" required />
          <label htmlFor="certify">
            I certify that the information provided is accurate and I agree to the{" "}
            <a
              href="/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              terms and conditions
            </a> for system access *
          </label>
        </div>
        <div style={{ display: "flex", gap: 280, marginTop: 18 }}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate("/access-details")}
          >
            Back
          </button>
          <button
  type="submit"
  className={styles.submitButton}
  disabled={isSubmitDisabled}
>
  Submit
</button>

        </div>
      </form>
    </div>
  );
};

export default ReviewSubmit;
