import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../auth.scss";

const ForgotPassword = () => {
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    const { error: resetError } = await sendPasswordReset(email.trim());

    setBusy(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    // Deliberately says "if an account exists" — confirming which emails are
    // registered would let someone enumerate your customer list.
    setSent(true);
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <h1>Reset password</h1>
        <p className="subtitle">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>

        {error && <div className="alert error">{error}</div>}

        {sent ? (
          <div className="alert success">
            If an account exists for {email.trim()}, a reset link is on its way. The
            link expires in one hour.
          </div>
        ) : (
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

            <button className="submit" type="submit" disabled={busy}>
              {busy ? "Sending…" : "SEND RESET LINK"}
            </button>
          </form>
        )}

        <p className="altAction">
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
