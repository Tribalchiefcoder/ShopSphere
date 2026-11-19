import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import {
  Users,
  UserPlus,
  Search,
  LoaderCircle,
  UserRound,
  RefreshCw,
} from "lucide-react";

import AdminSidebar from "../../components/AdminSidebar";
import "../../App.css";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/admin/customers`;

function AdminCustomers() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [newCustomers, setNewCustomers] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch registered customers
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("shopsphere-token");

      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCustomers(response.data.customers);
      setTotalCustomers(response.data.totalCustomers);
      setNewCustomers(response.data.newCustomersThisMonth);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("shopsphere-token");
        localStorage.removeItem("shopsphere-user");

        navigate("/admin/login", { replace: true });
        return;
      }

      setError(err.response?.data?.message || "Unable to fetch customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Search customers
  const filteredCustomers = customers.filter((customer) => {
    const query = search.toLowerCase().trim();

    return (
      customer.name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query)
    );
  });

  // Generate customer initials
  const getInitials = (name) => {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  };

  // Format registration date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="admin-layout admin-customers-page">
      {/* REUSABLE ADMIN SIDEBAR */}
      <AdminSidebar />

      {/* MAIN CONTENT */}
      <main className="admin-main customers-main">
        <header className="customers-header">
          <div>
            <span className="customers-eyebrow">CUSTOMER MANAGEMENT</span>

            <h1>Customers</h1>

            <p>View and monitor your registered customers.</p>
          </div>

          <button
            className="customers-refresh"
            onClick={fetchCustomers}
            disabled={loading}
          >
            <RefreshCw size={17} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </header>

        {/* STATISTICS */}
        <div className="customers-stats-grid">
          <div className="customers-stat-card">
            <div className="customers-stat-icon">
              <Users size={25} />
            </div>

            <div>
              <p>Total Customers</p>
              <h2>{loading ? "—" : totalCustomers}</h2>
              <span>Registered customer accounts</span>
            </div>
          </div>

          <div className="customers-stat-card">
            <div className="customers-stat-icon">
              <UserPlus size={25} />
            </div>

            <div>
              <p>New This Month</p>
              <h2>{loading ? "—" : newCustomers}</h2>
              <span>New customer registrations</span>
            </div>
          </div>
        </div>

        {/* CUSTOMERS TABLE */}
        <section className="customers-table-card">
          <div className="customers-table-header">
            <div>
              <h2>All Customers</h2>
              <p>Registered ShopSphere customers</p>
            </div>

            <div className="customers-search">
              <Search size={19} />

              <input
                type="search"
                placeholder="Search name or email..."
                aria-label="Search customers"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="customers-empty">
              <LoaderCircle size={35} className="spin" />
              <p>Loading customers...</p>
            </div>
          ) : error ? (
            <div className="customers-error" role="alert">
              <p>{error}</p>

              <button onClick={fetchCustomers}>Try Again</button>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="customers-empty">
              <UserRound size={40} />

              <h3>No customers found</h3>

              <p>
                {search
                  ? "Try a different search term."
                  : "Registered customers will appear here."}
              </p>
            </div>
          ) : (
            <div className="customers-table-wrapper">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Email Address</th>
                    <th>Registration Date</th>
                    <th>Role</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer._id}>
                      <td>
                        <div className="customers-name-cell">
                          <div className="customers-avatar">
                            {getInitials(customer.name)}
                          </div>

                          <div>
                            <strong>{customer.name}</strong>

                            <span>
                              ID: {customer._id.slice(-8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>{customer.email}</td>

                      <td>{formatDate(customer.createdAt)}</td>

                      <td>
                        <span className="customers-role-badge">Customer</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && (
            <div className="customers-table-footer">
              Showing {filteredCustomers.length} of {totalCustomers} customers
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminCustomers;
