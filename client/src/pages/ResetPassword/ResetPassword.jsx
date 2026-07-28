import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../auth.scss";

const MIN_PASSWORD_LENGTH = 8;

// Landing page for the link in the reset email. Supabase puts a short-lived
// recovery session in the URL, and supabaseClient's detectSessionInUrl picks it
// up — which is why we can set a new password without asking for the old one.
const ResetPassword = () => {
  const { updatePassword, isLoggedIn, loading } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await updatePassword(password);
    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => navigate("/", { replace: true }), 2000);
  };

  if (loading) {
    return (
      <div className="authPage">
        <div className="authCard">
          <p className="subtitle">Checking your link…</p>
        </div>
      </div>
    );
  }

  // No session means the link was already used, expired, or was tampered with.
  if (!isLoggedIn) {
    return (
      <div className="authPage">
        <div className="authCard">
          <h1>Link expired</h1>
          <div className="alert error">
            This password reset link is invalid or has already been used.
          </div>
          <p className="altAction">
            <Link to="/forgot-password">Request a new link</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <h1>Set a new password</h1>
        <p className="subtitle">Choose a password you haven&apos;t used before.</p>

        {error && <div className="alert error">{error}</div>}
        {done && (
          <div className="alert success">
            Password updated. Taking you back to the store…
          </div>
        )}

        {!done && (
          <form onSubmit={handleSubmit}>
            <label>
              New password
              <div className="passwordField">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
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

            <label>
              Confirm new password
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
              />
            </label>

            <button className="submit" type="submit" disabled={busy}>
              {busy ? "Updating…" : "UPDATE PASSWORD"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
