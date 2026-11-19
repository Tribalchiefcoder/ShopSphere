import { useState } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LockKeyhole, Mail, LoaderCircle, ArrowLeft } from "lucide-react";

import "../../App.css";

function CustomerLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine where the customer should go after login
  const redirectTo =
    location.state?.from === "/checkout" ? "/checkout" : "/my-orders";

  const sessionMessage = location.state?.message || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/login`,
        {
          email: email.trim(),
          password,
        },
      );

      if (response.data.user.role !== "user") {
        setError("This login page is only for customer accounts.");
        return;
      }

      localStorage.setItem("shopsphere-customer-token", response.data.token);

      localStorage.setItem(
        "shopsphere-customer-user",
        JSON.stringify(response.data.user),
      );

      // Redirect to checkout or My Orders
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-auth-page">
      <div className="customer-auth-card">
        <button
          className="auth-back-button"
          onClick={() => navigate(redirectTo === "/checkout" ? "/cart" : "/")}
          disabled={loading}
        >
          <ArrowLeft size={17} />

          {redirectTo === "/checkout" ? "Back to Cart" : "Back to Shop"}
        </button>

        <div className="customer-auth-heading">
          <div className="customer-auth-icon">
            <LockKeyhole size={27} />
          </div>

          <h1>Welcome Back</h1>

          <p>
            {redirectTo === "/checkout"
              ? "Sign in to continue with your checkout."
              : "Sign in to manage your ShopSphere orders."}
          </p>
        </div>

        {sessionMessage && !error && (
          <div className="customer-auth-error" role="alert">
            {sessionMessage}
          </div>
        )}

        {error && (
          <div className="customer-auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label htmlFor="email">Email Address</label>

          <div className="customer-auth-input">
            <Mail size={18} />

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <label htmlFor="password">Password</label>

          <div className="customer-auth-input">
            <LockKeyhole size={18} />

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="customer-auth-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle className="spin" size={18} />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="customer-auth-switch">
          Don't have an account?{" "}
          <Link to="/register" state={{ from: redirectTo }}>
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default CustomerLogin;
