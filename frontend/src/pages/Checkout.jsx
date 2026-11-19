import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  ShoppingBag,
  MapPin,
  Banknote,
  ShieldCheck,
  LoaderCircle,
  CheckCircle2,
} from "lucide-react";

import { useCart } from "../context/CartContext";
import "../App.css";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/orders`;

function Checkout() {
  const navigate = useNavigate();

  const { cartItems, cartTotal, cartCount, clearCart } = useCart();

  const [shippingAddress, setShippingAddress] = useState(() => {
    let customerName = "";

    try {
      const savedUser = localStorage.getItem("shopsphere-customer-user");

      if (savedUser) {
        customerName = JSON.parse(savedUser)?.name || "";
      }
    } catch {
      customerName = "";
    }

    return {
      fullName: customerName,
      phone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
    };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});
  const [validationAttempt, setValidationAttempt] = useState(0);
  const errorRef = useRef(null);

  useEffect(() => {
    if (!error) return;
    const target =
      document.querySelector(".checkout-page [aria-invalid='true']") ||
      errorRef.current;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error, validationAttempt]);

  const token = localStorage.getItem("shopsphere-customer-token");

  // Redirect unauthenticated customers to login
  useEffect(() => {
    if (!token && cartItems.length > 0) {
      navigate("/login", {
        state: { from: "/checkout" },
        replace: true,
      });
    }
  }, [token, cartItems.length, navigate]);

  const formatPrice = (price) => {
    return `₹${Number(price).toLocaleString("en-IN")}`;
  };

  // Handle shipping form inputs
  const handleChange = (e) => {
    const { name, value } = e.target;

    let updatedValue = value;

    if (name === "phone") {
      updatedValue = value.replace(/\D/g, "").slice(0, 10);
    }

    if (name === "postalCode") {
      updatedValue = value.replace(/\D/g, "").slice(0, 6);
    }

    setShippingAddress((previousAddress) => ({
      ...previousAddress,
      [name]: updatedValue,
    }));

    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[name];
      return next;
    });
    setError("");
  };

  // Place customer order
  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setFieldErrors({});
    setValidationAttempt((previous) => previous + 1);

    const customerToken = localStorage.getItem("shopsphere-customer-token");

    if (!customerToken) {
      navigate("/login", {
        state: { from: "/checkout" },
        replace: true,
      });

      return;
    }

    if (cartItems.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    const cleanedAddress = Object.fromEntries(
      Object.entries(shippingAddress).map(([key, value]) => [
        key,
        value.trim(),
      ]),
    );

    // Validate all shipping fields before sending the request
    const errors = {};
    const labels = {
      fullName: "full name",
      phone: "phone number",
      address: "street address",
      city: "city",
      state: "state",
      postalCode: "PIN code",
    };

    for (const [field, label] of Object.entries(labels)) {
      if (!cleanedAddress[field]) {
        errors[field] = `Please enter your ${label}.`;
      } else if (
        field === "phone" &&
        !/^[6-9]\d{9}$/.test(cleanedAddress.phone)
      ) {
        errors[field] =
          "Enter a 10-digit mobile number starting with 6, 7, 8 or 9.";
      } else if (
        field === "postalCode" &&
        !/^[1-9]\d{5}$/.test(cleanedAddress.postalCode)
      ) {
        errors[field] = "Enter a valid 6-digit PIN code.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please correct the highlighted fields.");
      return;
    }

    try {
      setLoading(true);

      const orderData = {
        items: cartItems.map((item) => ({
          productId: item._id,
          quantity: item.quantity,
        })),
        shippingAddress: cleanedAddress,
        paymentMethod: "COD",
      };

      const response = await axios.post(API_URL, orderData, {
        headers: {
          Authorization: `Bearer ${customerToken}`,
        },
      });

      if (response.data.success) {
        clearCart();

        navigate("/my-orders", {
          replace: true,
        });
      } else {
        setError("Unable to confirm your order.");
      }
    } catch (err) {
      console.error(
        "Order placement failed:",
        err.response?.status || err.message,
      );

      // Handle expired or invalid customer session
      if (err.response?.status === 401) {
        localStorage.removeItem("shopsphere-customer-token");
        localStorage.removeItem("shopsphere-customer-user");

        navigate("/login", {
          state: {
            from: "/checkout",
            message: "Your session has expired. Please log in again.",
          },
          replace: true,
        });

        return;
      }

      setError(
        err.response?.data?.message ||
          "Unable to place your order. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Empty cart
  if (cartItems.length === 0) {
    return (
      <main className="cart-page">
        <div className="empty-cart">
          <div className="empty-cart-icon">
            <ShoppingBag size={60} />
          </div>

          <h1>Your cart is empty</h1>

          <p>Add products to your cart before checking out.</p>

          <button
            className="continue-shopping-button"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={18} />
            Continue Shopping
          </button>
        </div>
      </main>
    );
  }

  // Prevent unauthenticated customers from viewing the form
  if (!token) {
    return null;
  }

  return (
    <main className="checkout-page">
      {/* PAGE HEADER */}
      <header className="checkout-header">
        <div>
          <span className="cart-eyebrow">ALMOST THERE</span>

          <h1>Checkout</h1>

          <p>Complete your shipping information to place your order.</p>
        </div>

        <button
          className="cart-continue-button"
          onClick={() => navigate("/cart")}
          disabled={loading}
        >
          <ArrowLeft size={18} />
          Back to Cart
        </button>
      </header>

      <form noValidate onSubmit={handlePlaceOrder} className="checkout-layout">
        {/* SHIPPING INFORMATION */}
        <section className="checkout-shipping">
          <div className="checkout-section-heading">
            <MapPin size={23} />
            <h2>Shipping Address</h2>
          </div>

          {error && (
            <div
              className="checkout-error"
              role="alert"
              ref={errorRef}
              tabIndex={-1}
            >
              {error}
            </div>
          )}

          <div className="checkout-form-grid">
            <div className="checkout-field">
              <label htmlFor="fullName">Full Name</label>

              <input
                id="fullName"
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                value={shippingAddress.fullName}
                onChange={handleChange}
                autoComplete="name"
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.fullName)}
                aria-describedby={
                  fieldErrors.fullName ? "fullName-error" : undefined
                }
                required
              />
              {fieldErrors.fullName && (
                <span className="checkout-field-error" id="fullName-error">
                  {fieldErrors.fullName}
                </span>
              )}
            </div>

            <div className="checkout-field">
              <label htmlFor="phone">Phone Number</label>

              <input
                id="phone"
                type="tel"
                name="phone"
                inputMode="numeric"
                placeholder="Enter mobile number"
                value={shippingAddress.phone}
                onChange={handleChange}
                autoComplete="tel-national"
                maxLength={10}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                required
              />
              {fieldErrors.phone && (
                <span className="checkout-field-error" id="phone-error">
                  {fieldErrors.phone}
                </span>
              )}
            </div>

            <div className="checkout-field checkout-full-width">
              <label htmlFor="address">Street Address</label>

              <textarea
                id="address"
                name="address"
                placeholder="House number, building, street and locality"
                value={shippingAddress.address}
                onChange={handleChange}
                autoComplete="street-address"
                rows={3}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.address)}
                aria-describedby={
                  fieldErrors.address ? "address-error" : undefined
                }
                required
              />
              {fieldErrors.address && (
                <span className="checkout-field-error" id="address-error">
                  {fieldErrors.address}
                </span>
              )}
            </div>

            <div className="checkout-field">
              <label htmlFor="city">City</label>

              <input
                id="city"
                type="text"
                name="city"
                placeholder="Enter city"
                value={shippingAddress.city}
                onChange={handleChange}
                autoComplete="address-level2"
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.city)}
                aria-describedby={fieldErrors.city ? "city-error" : undefined}
                required
              />
              {fieldErrors.city && (
                <span className="checkout-field-error" id="city-error">
                  {fieldErrors.city}
                </span>
              )}
            </div>

            <div className="checkout-field">
              <label htmlFor="state">State</label>

              <input
                id="state"
                type="text"
                name="state"
                placeholder="Enter state"
                value={shippingAddress.state}
                onChange={handleChange}
                autoComplete="address-level1"
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.state)}
                aria-describedby={fieldErrors.state ? "state-error" : undefined}
                required
              />
              {fieldErrors.state && (
                <span className="checkout-field-error" id="state-error">
                  {fieldErrors.state}
                </span>
              )}
            </div>

            <div className="checkout-field">
              <label htmlFor="postalCode">PIN Code</label>

              <input
                id="postalCode"
                type="text"
                inputMode="numeric"
                name="postalCode"
                placeholder="Enter 6-digit PIN code"
                value={shippingAddress.postalCode}
                onChange={handleChange}
                autoComplete="postal-code"
                maxLength={6}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.postalCode)}
                aria-describedby={
                  fieldErrors.postalCode ? "postalCode-error" : undefined
                }
                required
              />
              {fieldErrors.postalCode && (
                <span className="checkout-field-error" id="postalCode-error">
                  {fieldErrors.postalCode}
                </span>
              )}
            </div>
          </div>

          {/* PAYMENT METHOD */}
          <div className="checkout-payment">
            <div className="checkout-section-heading">
              <Banknote size={23} />
              <h2>Payment Method</h2>
            </div>

            <div className="checkout-payment-option">
              <Banknote size={26} />

              <div>
                <strong>Cash on Delivery</strong>
                <p>Pay when your order arrives.</p>
              </div>

              <CheckCircle2 size={22} />
            </div>
          </div>
        </section>

        {/* ORDER SUMMARY */}
        <aside className="checkout-summary">
          <h2>Order Summary</h2>

          <div className="checkout-summary-items">
            {cartItems.map((item) => (
              <div className="checkout-summary-item" key={item._id}>
                <div className="checkout-item-image">
                  {item.images?.[0] ? (
                    <img src={item.images[0]} alt={item.name} />
                  ) : (
                    <ShoppingBag size={25} />
                  )}
                </div>

                <div className="checkout-item-info">
                  <h4>{item.name}</h4>

                  <p>Quantity: {item.quantity}</p>

                  <strong>{formatPrice(item.price * item.quantity)}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="summary-divider"></div>

          <div className="summary-row">
            <span>Items ({cartCount})</span>
            <span>{formatPrice(cartTotal)}</span>
          </div>

          <div className="summary-row">
            <span>Delivery</span>
            <span className="free-delivery">FREE</span>
          </div>

          <div className="summary-divider"></div>

          <div className="summary-total">
            <span>Total Amount</span>
            <strong>{formatPrice(cartTotal)}</strong>
          </div>

          <button type="submit" className="checkout-button" disabled={loading}>
            {loading ? (
              <>
                <LoaderCircle size={19} className="checkout-spinner" />
                Placing Order...
              </>
            ) : (
              <>
                <ShoppingBag size={19} />
                Place Order
              </>
            )}
          </button>

          <div className="checkout-security-note">
            <ShieldCheck size={17} />
            <span>Cash on Delivery checkout</span>
          </div>
        </aside>
      </form>
    </main>
  );
}

export default Checkout;
