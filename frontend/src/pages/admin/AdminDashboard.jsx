import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

import AdminSidebar from "../../components/AdminSidebar";
import "../../App.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const [totalProducts, setTotalProducts] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingLowStock, setLoadingLowStock] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const [customerStatsError, setCustomerStatsError] = useState(false);

  // Fetch product statistics
  useEffect(() => {
    const fetchProductStats = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/products?limit=100`,
        );

        const products = response.data.products;

        setTotalProducts(response.data.totalProducts);

        const lowStockProducts = products.filter(
          (product) => product.stock <= 5,
        );

        setLowStock(lowStockProducts.length);
      } catch (error) {
        console.error("Failed to fetch product statistics:", error);
      } finally {
        setLoadingProducts(false);
        setLoadingLowStock(false);
      }
    };

    fetchProductStats();
  }, []);

  // Fetch order statistics
  useEffect(() => {
    const fetchOrderStats = async () => {
      try {
        const token = localStorage.getItem("shopsphere-token");

        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/orders/admin/all`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        setTotalOrders(response.data.count);
      } catch (error) {
        console.error("Failed to fetch order statistics:", error);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrderStats();
  }, []);

  // Fetch customer statistics
  useEffect(() => {
    const fetchCustomerStats = async () => {
      try {
        setLoadingCustomers(true);
        setCustomerStatsError(false);

        const token = localStorage.getItem("shopsphere-token");

        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/admin/customers/stats`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 10000,
          },
        );

        setTotalCustomers(response.data.totalCustomers);
      } catch (error) {
        console.error("Failed to fetch customer statistics:", error);

        setCustomerStatsError(true);
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomerStats();
  }, []);

  return (
    <div className="admin-layout">
      {/* REUSABLE SIDEBAR */}
      <AdminSidebar />

      {/* MAIN CONTENT */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-eyebrow">STORE MANAGEMENT</span>

            <h1>Dashboard</h1>
          </div>

          <button className="admin-store-button" onClick={() => navigate("/")}>
            Visit Store
            <ArrowUpRight size={17} />
          </button>
        </header>

        {/* WELCOME SECTION */}
        <section className="admin-welcome">
          <div>
            <span>WELCOME BACK</span>
            <h2>Your store at a glance.</h2>
            <p>Manage your products and keep your store running smoothly.</p>
          </div>
        </section>

        {/* STATISTICS */}
        <section className="admin-stats">
          <div className="admin-stat-card">
            <span>Total Products</span>

            <h3>{loadingProducts ? "..." : totalProducts}</h3>

            <p>Products in your catalog</p>
          </div>

          <div className="admin-stat-card">
            <span>Total Orders</span>

            <h3>{loadingOrders ? "..." : totalOrders}</h3>

            <p>Orders received</p>
          </div>

          <div className="admin-stat-card">
            <span>Total Customers</span>

            <h3>
              {loadingCustomers
                ? "..."
                : customerStatsError
                  ? "—"
                  : totalCustomers}
            </h3>

            <p>
              {customerStatsError
                ? "Unable to load customer count"
                : "Registered customers"}
            </p>
          </div>

          <div className="admin-stat-card">
            <span>Low Stock</span>

            <h3>{loadingLowStock ? "..." : lowStock}</h3>

            <p>Products with 5 or fewer units</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
