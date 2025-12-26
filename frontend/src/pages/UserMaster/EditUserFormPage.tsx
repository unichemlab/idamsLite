import React from "react";
import AddUserPanel, { UserForm } from "./AddUserPanel";
import styles from "./AddUserFormPage.module.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserContext } from "../../context/UserContext";

const EditUserFormPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { editUser } = useUserContext();
  const userData: UserForm | null = location.state?.userData || null;
  const userIdx: number | null = location.state?.userIdx ?? null;
  const handleSave = async (user: UserForm) => {
    if (userData) {
      // Prefer DB id if available, otherwise fall back to empCode
      // editUser expects a string userId which should match backend's identifier
      const backendId = (userData as any).id
        ? String((userData as any).id)
        : userData.empCode;
      await editUser(backendId, user);
    }
    navigate("/superadmin", { state: { activeTab: "user" } });
  };
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      {/* <Sidebar open={true} onToggle={() => {}} navItems={navItems} onLogout={() => {}} /> */}
      {/* Main Content */}
      <div style={{ flex: 1 }}>
        <div className={styles.addUserFormPageWrapper}>
          <div className={styles.addUserFormPageContainer}>
            <AddUserPanel
              onClose={() =>
                navigate("/user-master", { state: { activeTab: "user" } })
              }
              onSave={handleSave}
              initialData={userData}
              mode="edit"
              panelClassName={styles.fullPagePanel}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditUserFormPage;
