import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../auth.scss";

// Where Google sends the user back to. supabaseClient has detectSessionInUrl
// on, so by the time AuthContext reports loading:false the session (if any) is
// already stored — this page just waits for that and forwards on.
const AuthCallback = () => {
  const { loading, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    navigate(isLoggedIn ? "/profile" : "/login", { replace: true });
  }, [loading, isLoggedIn, navigate]);

  return (
    <div className="authPage">
      <div className="authCard">
        <h1>Signing you in…</h1>
        <p className="subtitle">One moment while we finish setting things up.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
