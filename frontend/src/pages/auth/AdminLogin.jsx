import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ShoppingBag,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  LoaderCircle,
} from "lucide-react";

import "../../App.css";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/login`,
        { email, password },
      );

      const { user, token } = response.data;

      if (user.role !== "admin") {
        setError("Access denied. Admin account required.");
        return;
      }

      localStorage.setItem("shopsphere-token", token);
      localStorage.setItem("shopsphere-user", JSON.stringify(user));

      navigate("/admin");
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <div className="admin-login-logo">
            <ShoppingBag size={27} />
          </div>

          <h1>ShopSphere</h1>
          <span>ADMINISTRATION</span>
        </div>

        <div className="admin-login-heading">
          <h2>Welcome back</h2>
          <p>Sign in to manage your store.</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="admin-login-field">
            <label htmlFor="admin-email">Email Address</label>

            <div className="admin-login-input">
              <Mail size={18} />

              <input
                id="admin-email"
                type="email"
                placeholder="Enter your admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="admin-login-field">
            <label htmlFor="admin-password">Password</label>

            <div className="admin-login-input">
              <Lock size={18} />

              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="admin-login-error">{error}</div>}

          <button
            type="submit"
            className="admin-login-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle size={19} className="login-spinner" />
                Signing in...
              </>
            ) : (
              <>
                Sign In to Dashboard
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <button className="admin-login-back" onClick={() => navigate("/")}>
          Back to Store
        </button>

        <p className="admin-login-footer">ShopSphere Admin Portal</p>
      </div>
    </main>
  );
}

export default AdminLogin;
