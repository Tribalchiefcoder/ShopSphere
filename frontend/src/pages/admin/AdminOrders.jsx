import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  ArrowLeft,
  Search,
  LoaderCircle,
  RefreshCw,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  Eye,
  X,
} from "lucide-react";

import AdminSidebar from "../../components/AdminSidebar";
import "../../App.css";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/orders`;

function AdminOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [updateError, setUpdateError] = useState("");

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const selectedOrder = orders.find((order) => order._id === selectedOrderId);

  // Fetch all customer orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("shopsphere-token");

      if (!token) {
        setError("Your admin session has expired. Please log in again.");
        return;
      }

      const response = await axios.get(`${API_URL}/admin/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setOrders(response.data.orders || []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load orders. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!selectedOrderId) return;
    const handleKey = (event) => {
      if (event.key === "Escape") setSelectedOrderId(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedOrderId]);

  // Calculate statistics from all orders, independently of filters
  const orderStats = [
    {
      label: "Total Orders",
      count: orders.length,
      icon: ShoppingBag,
      tone: "total",
    },
    ...[
      { label: "Processing", icon: Clock, tone: "processing" },
      { label: "Shipped", icon: Truck, tone: "shipped" },
      { label: "Delivered", icon: CheckCircle, tone: "delivered" },
      { label: "Cancelled", icon: XCircle, tone: "cancelled" },
    ].map((stat) => ({
      ...stat,
      count: orders.filter((order) => order.orderStatus === stat.label).length,
    })),
  ];

  // Search orders by ID or customer information
  const filteredOrders = orders.filter((order) => {
    const customerName = order.user?.name || "";
    const customerEmail = order.user?.email || "";
    const orderId = order._id || "";

    const searchText =
      `${orderId} ${customerName} ${customerEmail}`.toLowerCase();

    const matchesSearch = searchText.includes(search.trim().toLowerCase());
    const matchesStatus =
      statusFilter === "all" || order.orderStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Update order status
  const handleStatusChange = async (orderId, newStatus) => {
    const order = orders.find((item) => item._id === orderId);

    if (!order || order.orderStatus === newStatus) return;

    if (newStatus === "Cancelled") {
      const confirmed = window.confirm(
        "Are you sure you want to cancel this order? The purchased product quantities will be returned to stock.",
      );

      if (!confirmed) return;
    }

    try {
      setUpdatingOrderId(orderId);
      setUpdateError("");
      setSuccessMessage("");

      const token = localStorage.getItem("shopsphere-token");

      const response = await axios.put(
        `${API_URL}/admin/${orderId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setOrders((previousOrders) =>
        previousOrders.map((item) =>
          item._id === orderId
            ? {
                ...item,
                ...response.data.order,
                user: item.user,
                items: item.items,
              }
            : item,
        ),
      );

      setSuccessMessage(`Order #${orderId.slice(-8)} updated to ${newStatus}.`);
    } catch (err) {
      console.error("Failed to update order:", err);

      setUpdateError(
        err.response?.data?.message ||
          "Failed to update order status. Please try again.",
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <AdminSidebar />

      {/* MAIN CONTENT */}
      <main className="admin-main admin-orders-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-eyebrow">STORE MANAGEMENT</span>
            <h1>Orders</h1>
          </div>

          <button
            className="admin-store-button"
            onClick={() => navigate("/admin")}
          >
            Back to Dashboard
            <ArrowLeft size={17} />
          </button>
        </header>

        <section className="admin-products-section">
          {/* PAGE HEADING */}
          <div className="admin-products-heading">
            <div>
              <h2>Order Management</h2>
              <p>View customer orders and manage their delivery status.</p>
            </div>

            <button
              className="admin-add-product"
              onClick={fetchOrders}
              disabled={loading || updatingOrderId !== null}
            >
              <RefreshCw size={17} />
              Refresh Orders
            </button>
          </div>

          {/* ORDER STATISTICS */}
          <div className="admin-order-stats">
            {orderStats.map(({ label, count, icon: Icon, tone }) => (
              <div key={label} className="admin-order-stat">
                <div className={`admin-order-stat-icon stat-${tone}`}>
                  <Icon size={21} />
                </div>
                <span>{label}</span>
                <strong>{loading || error ? "—" : count}</strong>
              </div>
            ))}
          </div>

          {/* NOTIFICATIONS */}
          {successMessage && (
            <div className="admin-product-success">{successMessage}</div>
          )}

          {updateError && (
            <div className="admin-login-error">{updateError}</div>
          )}

          {/* SEARCH TOOLBAR */}
          <div className="admin-products-toolbar">
            <div className="admin-product-search">
              <Search size={18} />

              <input
                type="text"
                aria-label="Search orders"
                placeholder="Search by order ID or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="admin-order-filter"
              aria-label="Filter orders by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Orders</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <span>{filteredOrders.length} orders</span>
          </div>

          {/* ORDER RESULTS */}
          {loading ? (
            <div className="admin-products-message">
              <LoaderCircle size={25} className="admin-order-loader" />
              <p>Loading orders...</p>
            </div>
          ) : error ? (
            <div className="admin-products-message">
              <p>{error}</p>

              <button className="admin-add-product" onClick={fetchOrders}>
                Try Again
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="admin-products-message">
              <ShoppingBag size={30} />
              <p>
                {search.trim() || statusFilter !== "all"
                  ? "No matching orders found."
                  : "No orders have been placed yet."}
              </p>
            </div>
          ) : (
            <div className="admin-products-table-wrapper">
              <table className="admin-products-table admin-orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Products</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order._id}>
                      <td>
                        <strong>#{order._id.slice(-8).toUpperCase()}</strong>
                      </td>

                      <td>
                        <div className="admin-product-name">
                          <strong>
                            {order.user?.name || "Unknown Customer"}
                          </strong>
                          <span>
                            {order.user?.email || "Customer unavailable"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="admin-order-items">
                          {order.items.map((item, index) => (
                            <span key={`${order._id}-${index}`}>
                              {item.name} × {item.quantity}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td>{formatDate(order.createdAt)}</td>

                      <td>
                        <strong>
                          ₹{Number(order.totalAmount).toLocaleString("en-IN")}
                        </strong>
                      </td>

                      <td>
                        <div className="admin-product-name">
                          <strong>{order.paymentMethod}</strong>
                          <span
                            className={`order-payment-badge payment-${String(order.paymentStatus).toLowerCase()}`}
                          >
                            {order.paymentStatus}
                          </span>
                        </div>
                      </td>

                      <td>
                        <select
                          className={`admin-order-status status-${order.orderStatus
                            ?.toLowerCase()
                            .replace(/\s+/g, "-")}`}
                          value={order.orderStatus}
                          disabled={
                            updatingOrderId !== null ||
                            order.orderStatus === "Delivered" ||
                            order.orderStatus === "Cancelled"
                          }
                          onChange={(e) =>
                            handleStatusChange(order._id, e.target.value)
                          }
                        >
                          <option value="Processing">Processing</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>

                        {updatingOrderId === order._id && (
                          <LoaderCircle
                            size={16}
                            className="admin-order-loader"
                          />
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="order-details-button"
                          onClick={() => setSelectedOrderId(order._id)}
                        >
                          <Eye size={16} /> View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {selectedOrder && (
        <div
          className="order-details-overlay"
          onClick={() => setSelectedOrderId(null)}
        >
          <section
            className="order-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-details-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="order-details-header">
              <h2 id="order-details-title">Order Details</h2>
              <button
                type="button"
                autoFocus
                aria-label="Close order details"
                onClick={() => setSelectedOrderId(null)}
              >
                <X size={22} />
              </button>
            </header>
            <p className="order-details-id">#{selectedOrder._id}</p>
            <p>
              {formatDate(selectedOrder.createdAt)} ·{" "}
              {selectedOrder.orderStatus}
            </p>
            <div className="order-details-grid">
              <div>
                <h3>Customer</h3>
                <p>{selectedOrder.user?.name || "Unavailable"}</p>
                <p>{selectedOrder.user?.email || "Unavailable"}</p>
              </div>
              <div>
                <h3>Shipping Address</h3>
                {selectedOrder.shippingAddress ? (
                  <>
                    <p>{selectedOrder.shippingAddress.fullName}</p>
                    <p>{selectedOrder.shippingAddress.phone}</p>
                    <p>{selectedOrder.shippingAddress.address}</p>
                    <p>
                      {selectedOrder.shippingAddress.city},{" "}
                      {selectedOrder.shippingAddress.state}{" "}
                      {selectedOrder.shippingAddress.postalCode}
                    </p>
                  </>
                ) : (
                  <p>Address unavailable</p>
                )}
              </div>
            </div>
            <h3>Purchased Products</h3>
            {selectedOrder.items.map((item, index) => (
              <div className="order-details-item" key={index}>
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    ₹{Number(item.price).toLocaleString("en-IN")} ×{" "}
                    {item.quantity}
                  </p>
                </div>
                <strong>
                  ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                </strong>
              </div>
            ))}
            <div className="order-details-grid">
              <div>
                <h3>Payment Method</h3>
                <p>{selectedOrder.paymentMethod}</p>
              </div>
              <div>
                <h3>Payment Status</h3>
                <p>{selectedOrder.paymentStatus}</p>
              </div>
            </div>
            <div className="order-details-total">
              <strong>Total Amount</strong>
              <strong>
                ₹{Number(selectedOrder.totalAmount).toLocaleString("en-IN")}
              </strong>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminOrders;
