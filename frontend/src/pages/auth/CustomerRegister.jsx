import { useState } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, Mail, LockKeyhole, LoaderCircle, ArrowLeft } from "lucide-react";

import "../../App.css";

function CustomerRegister() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine destination after registration
  const redirectTo =
    location.state?.from === "/checkout" ? "/checkout" : "/my-orders";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    // Validate full name
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    // Validate password
    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/register`,
        {
          name: name.trim(),
          email: email.trim(),
          password,
        },
      );

      // Save customer authentication information
      localStorage.setItem("shopsphere-customer-token", response.data.token);

      localStorage.setItem(
        "shopsphere-customer-user",
        JSON.stringify(response.data.user),
      );

      // Redirect to checkout or My Orders
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
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
            <User size={27} />
          </div>

          <h1>Create Account</h1>

          <p>
            {redirectTo === "/checkout"
              ? "Create an account to complete your order."
              : "Join ShopSphere and start shopping."}
          </p>
        </div>

        {error && (
          <div className="customer-auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <label htmlFor="name">Full Name</label>

          <div className="customer-auth-input">
            <User size={18} />

            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              disabled={loading}
              required
            />
          </div>

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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
              required
              minLength={6}
            />
          </div>

          <label htmlFor="confirmPassword">Confirm Password</label>

          <div className="customer-auth-input">
            <LockKeyhole size={18} />

            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
              required
              minLength={6}
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
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <p className="customer-auth-switch">
          Already have an account?{" "}
          <Link to="/login" state={{ from: redirectTo }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default CustomerRegister;
