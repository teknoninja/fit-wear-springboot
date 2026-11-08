import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Gate for routes that need a signed-in user.
//
// The `loading` check matters: on a hard refresh the session is read from
// localStorage asynchronously, so without it a logged-in user would be bounced
// to /login for a frame before their session resolved.
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: "80px", textAlign: "center", color: "#777" }}>
        Loading…
      </div>
    );
  }

  if (!isLoggedIn) {
    // Remember where they were headed so Login can send them back there.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default ProtectedRoute;
