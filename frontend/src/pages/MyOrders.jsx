import { useEffect, useState } from "react";
import axios from "axios";
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  ShoppingBag,
  ArrowLeft,
  LoaderCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/orders/my-orders`;

function MyOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("shopsphere-customer-token");

        if (!token) {
          setError("Please log in to view your orders.");
          return;
        }

        const response = await axios.get(API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setOrders(response.data.orders);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load your orders.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [navigate]);

  const getStatusIcon = (status) => {
    switch (status) {
      case "Delivered":
        return <CheckCircle size={17} />;
      case "Shipped":
        return <Truck size={17} />;
      case "Cancelled":
        return <XCircle size={17} />;
      default:
        return <Clock size={17} />;
    }
  };

  return (
    <div className="orders-page">
      <div className="orders-container">
        <button className="back-button" onClick={() => navigate("/")}>
          <ArrowLeft size={18} />
          Continue Shopping
        </button>

        <div className="orders-heading">
          <div>
            <span className="section-eyebrow">YOUR ACCOUNT</span>
            <h1>My Orders</h1>
            <p>Track and manage your purchases.</p>
          </div>

          <div className="orders-count">
            <Package size={20} />
            {orders.length} Orders
          </div>
        </div>

        {loading ? (
          <div className="orders-state">
            <LoaderCircle className="spin" size={32} />
            <p>Loading your orders...</p>
          </div>
        ) : error ? (
          <div className="orders-state error">{error}</div>
        ) : orders.length === 0 ? (
          <div className="orders-empty">
            <ShoppingBag size={48} />
            <h2>No orders yet</h2>
            <p>Your purchases will appear here.</p>
            <button onClick={() => navigate("/")}>Start Shopping</button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order._id}>
                <div className="order-card-header">
                  <div>
                    <span>ORDER ID</span>
                    <strong>#{order._id.slice(-8).toUpperCase()}</strong>
                  </div>

                  <div
                    className={`order-status ${order.orderStatus.toLowerCase()}`}
                  >
                    {getStatusIcon(order.orderStatus)}
                    {order.orderStatus}
                  </div>
                </div>

                <div className="order-products">
                  {order.items.map((item, index) => (
                    <div
                      className="order-product"
                      key={`${order._id}-${index}`}
                    >
                      <div className="order-product-image">
                        {item.image ? (
                          <img src={item.image} alt={item.name} />
                        ) : (
                          <Package size={28} />
                        )}
                      </div>

                      <div className="order-product-info">
                        <h3>{item.name}</h3>
                        <p>Quantity: {item.quantity}</p>
                        <p>₹{item.price.toLocaleString("en-IN")} each</p>
                      </div>

                      <strong>
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="order-card-footer">
                  <div>
                    <span>ORDERED ON</span>
                    <p>
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div>
                    <span>PAYMENT</span>
                    <p>
                      {order.paymentMethod} · {order.paymentStatus}
                    </p>
                  </div>

                  <div className="order-total">
                    <span>TOTAL AMOUNT</span>
                    <strong>
                      ₹{order.totalAmount.toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyOrders;
