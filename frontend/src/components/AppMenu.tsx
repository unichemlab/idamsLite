import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import { MENU_CONFIG, MenuItem } from "../config/masterModules";
import { canShowMenu } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import styles from "../pages/HomePage/homepageUser.module.css";

const AppMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [openMenu, setOpenMenu] = useState<Record<string, boolean>>({});

  const toggleMenu = (label: string) => {
    setOpenMenu((p) => ({ ...p, [label]: !p[label] }));
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.menuScroll}>
        {MENU_CONFIG.map((menu: MenuItem) => {
          // 🔹 GROUP MENU
          if (menu.children) {
            const visibleChildren = menu.children.filter((child) =>
              canShowMenu(child, user)
            );

            // ❌ Hide parent if no visible children
            if (visibleChildren.length === 0) return null;

            const isOpen = openMenu[menu.label];

            return (
              <div key={menu.label} className={styles.menuGroup}>
                <button
                  className={styles.menuHeader}
                  onClick={() => toggleMenu(menu.label)}
                >
                  <div className={styles.menuLeft}>
                    {menu.icon && <menu.icon size={18} />}
                    <span>{menu.label}</span>
                  </div>
                  {isOpen ? <FiChevronDown /> : <FiChevronRight />}
                </button>

                {isOpen && (
                  <div className={styles.subMenu}>
                    {visibleChildren.map((child) => (
                      <button
                        key={child.label}
                        onClick={() => navigate(child.route!)}
                        className={`${styles.subMenuItem} ${
                          location.pathname === child.route
                            ? styles.active
                            : ""
                        }`}
                      >
                        {child.icon && <child.icon size={16} />}
                        <span>{child.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // 🔹 SINGLE MENU
          if (!canShowMenu(menu, user)) return null;

          return (
            <button
              key={menu.label}
              className={`${styles.menuItem} ${
                location.pathname === menu.route ? styles.active : ""
              }`}
              onClick={() => navigate(menu.route!)}
            >
              {menu.icon && <menu.icon size={18} />}
              <span>{menu.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AppMenu;
