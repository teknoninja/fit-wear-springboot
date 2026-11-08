import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../auth.scss";

const MIN_PASSWORD_LENGTH = 8;

const Register = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    // Check locally first so the user gets feedback without a round trip.
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    const { error: signUpError, needsEmailConfirmation } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
    });
    setBusy(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (needsEmailConfirmation) {
      // Email confirmation is on in Supabase, so there is no session yet.
      setNotice(
        `Almost there — we sent a confirmation link to ${email.trim()}. ` +
          `Click it to activate your account, then sign in.`
      );
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <h1>Create account</h1>
        <p className="subtitle">Save your wishlist, track orders, check out faster.</p>

        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}

        <form onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              autoComplete="name"
              required
            />
          </label>

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
            Confirm password
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
            {busy ? "Creating account…" : "CREATE ACCOUNT"}
          </button>
        </form>

        <p className="altAction">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
