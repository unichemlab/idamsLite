import React, { useContext, useState } from "react";
import VendorMasterForm from "./VendorMasterForm";
import { VendorUser } from "./VendorMasterTable";
import { useNavigate, useLocation } from "react-router-dom";
import { VendorContext } from "../../context/VendorContext";
import { VendorUserWithId } from "../../context/VendorContext";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import styles from "../ApplicationMasterTable/ApplicationMasterTable.module.css";

const AddVendorFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialData = location.state?.initialData || null;
  const mode = location.state?.mode || "add";
  const { addVendor } = useContext(VendorContext);
  const username = localStorage.getItem("username") || "";
  const [showModal, setShowModal] = useState(false);
  const [pendingVendor, setPendingVendor] = useState<VendorUserWithId | null>(
    null
  );

  // Save handler: show confirm modal before adding
  const handleSave = (vendor: VendorUser) => {
    setPendingVendor({
      ...vendor,
      id: Math.random().toString(36).substr(2, 9),
    });
    setShowModal(true);
  };

  const handleConfirm = (data: any) => {
    if (data.username === username && data.password) {
      if (pendingVendor) {
        addVendor(pendingVendor);
      }
      setShowModal(false);
      setPendingVendor(null);
      navigate("/superadmin");
    } else {
      alert("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className={styles.addUserFormPageWrapper}>
      <div className={styles.addUserFormPageContainer}>
        <VendorMasterForm
          onClose={() => navigate("/superadmin")}
          onSave={handleSave}
          initialData={initialData}
          mode={mode}
        />
        {showModal && (
          <ConfirmLoginModal
            username={username}
            fields={[
              {
                name: "password",
                label: "Password",
                type: "password",
                required: true,
                placeholder: "Enter Password",
              },
            ]}
            onConfirm={handleConfirm}
            onCancel={() => {
              setShowModal(false);
              setPendingVendor(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AddVendorFormPage;
