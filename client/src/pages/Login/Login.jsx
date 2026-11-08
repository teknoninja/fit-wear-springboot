import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../auth.scss";

const Login = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // ProtectedRoute stashes the page the user was trying to reach, so after a
  // successful login we send them there instead of always to the homepage.
  const redirectTo = location.state?.from ?? "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    const { error: signInError } = await signIn({ email: email.trim(), password });

    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <h1>Welcome back</h1>
        <p className="subtitle">Sign in to your Fit-Wear account.</p>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <div className="passwordField">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="toggle"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
          </label>

          <Link className="forgotLink" to="/forgot-password">
            Forgot password?
          </Link>

          <button className="submit" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "SIGN IN"}
          </button>
        </form>

        <p className="altAction">
          New to Fit-Wear? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
