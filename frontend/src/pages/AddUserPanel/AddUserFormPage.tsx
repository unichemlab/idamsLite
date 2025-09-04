import React from "react";
import AddUserPanel, { UserForm } from "../AddUserPanel/AddUserPanel";
import styles from "./AddUserFormPage.module.css";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../../context/UserContext";

const AddUserFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { addUser } = useUserContext();
  const handleSave = (user: UserForm) => {
    addUser(user);
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
              mode="add"
              panelClassName={styles.fullPagePanel}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddUserFormPage;
