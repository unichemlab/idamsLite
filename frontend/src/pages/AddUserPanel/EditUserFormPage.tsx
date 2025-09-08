import React from "react";
import AddUserPanel, { UserForm } from "../AddUserPanel/AddUserPanel";
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
    if (typeof userIdx === "number" && userData && userData.empCode) {
      // Use empCode as userId for backend (adjust if you use another unique id)
      await editUser(userData.empCode, user);
    }
    navigate("/superadmin", { state: { activeTab: "user" } });
  };
  // Import Sidebar and navItems if needed
  // import Sidebar from "../../components/Common/Sidebar";
  // import navItems from "../../components/Common/navItems";
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
                navigate("/superadmin", { state: { activeTab: "user" } })
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
