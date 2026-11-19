import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  LogOut,
} from "lucide-react";

function AdminSidebar() {
  const navigate = useNavigate();

  const navigationItems = [
    {
      name: "Dashboard",
      path: "/admin",
      icon: LayoutDashboard,
    },
    {
      name: "Products",
      path: "/admin/products",
      icon: Package,
    },
    {
      name: "Orders",
      path: "/admin/orders",
      icon: ShoppingBag,
    },
    {
      name: "Customers",
      path: "/admin/customers",
      icon: Users,
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("shopsphere-token");
    localStorage.removeItem("shopsphere-user");

    navigate("/admin/login", { replace: true });
  };

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <ShoppingBag size={25} />
        <h2>ShopSphere</h2>
      </div>

      <div className="admin-menu-label">MAIN MENU</div>

      <nav className="admin-navigation">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin"}
              className={({ isActive }) =>
                `admin-nav-item${isActive ? " active" : ""}`
              }
            >
              <Icon size={19} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="admin-sidebar-bottom">
        <button
          type="button"
          className="admin-nav-item admin-logout"
          onClick={handleLogout}
        >
          <LogOut size={19} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
