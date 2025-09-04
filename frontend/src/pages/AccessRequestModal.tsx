import React from "react";
import styles from "./AccessRequestModal.module.css";

interface AccessRequestModalProps {
  open: boolean;
  onClose: () => void;
  request: any | null;
}

const AccessRequestModal: React.FC<AccessRequestModalProps> = ({
  open,
  onClose,
  request,
}) => {
  if (!open || !request) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>Access Request Details</h2>
        <table className={styles.detailsTable}>
          <tbody>
            {Object.entries(request).map(([key, value]) => (
              <tr key={key}>
                <td className={styles.label}>
                  {key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase())}
                </td>
                <td className={styles.value}>{String(value)}</td>
              </tr>
            ))}
          </tbody>
           
        </table>
        <button className={styles.closeBtn} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default AccessRequestModal;
