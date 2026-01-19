// AddUserFormPage.tsx
import React from "react";
import AddUserPanel, { UserForm } from "../UserMaster/AddUserPanel";
import AppHeader from "../../components/Common/AppHeader";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../../context/UserMasterContext";
import styles from "../Plant/AddPlantMaster.module.css";

const AddUserFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { addUser } = useUserContext();
  
  const handleSave = (user: UserForm) => {
    addUser(user);
    navigate("/user-master", { state: { activeTab: "user" } });
  };

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="User Management" />
      
      <div className={styles.contentArea}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Add New User</h2>
          </div>
          
          <AddUserPanel
            onClose={() =>
              navigate("/user-master", { state: { activeTab: "user" } })
            }
            onSave={handleSave}
            mode="add"
          />
        </div>
      </div>
    </div>
  );
};

export default AddUserFormPage;

// ============================================