// EditUserFormPage.tsx
import React from "react";
import AddUserPanel, { UserForm } from "../UserMaster/AddUserPanel";
import AppHeader from "../../components/Common/AppHeader";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserContext } from "../../context/UserMasterContext";
import styles from "../Plant/AddPlantMaster.module.css";

const EditUserFormPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { editUser } = useUserContext();
  const userData: UserForm | null = location.state?.userData || null;

  const handleSave = async (user: UserForm) => {
    if (userData) {
      const backendId = (userData as any).id
        ? String((userData as any).id)
        : userData.empCode;
      await editUser(backendId, user);
    }
    navigate("/user-master", { state: { activeTab: "user" } });
  };

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="User Management" />
      
      <div className={styles.contentArea}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Edit User</h2>
          </div>
          
          <AddUserPanel
            onClose={() =>
              navigate("/user-master", { state: { activeTab: "user" } })
            }
            onSave={handleSave}
            initialData={userData}
            mode="edit"
          />
        </div>
      </div>
    </div>
  );
};

export default EditUserFormPage;

// ============================================