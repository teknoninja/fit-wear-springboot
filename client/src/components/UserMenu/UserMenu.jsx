import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import { useAuth } from "../../context/AuthContext";
import "./UserMenu.scss";

// The navbar's account control. Signed out it links to /login; signed in it
// becomes an avatar with a dropdown.
const UserMenu = () => {
  const { user, profile, isLoggedIn, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on an outside click, matching how the cart drawer behaves.
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/", { replace: true });
  };

  // Render the signed-out icon while the session resolves, so the navbar does
  // not visibly jump between states on first paint.
  if (loading || !isLoggedIn) {
    return (
      <Link className="userMenuIcon" to="/login" title="Sign in">
        <PersonOutlineOutlinedIcon />
      </Link>
    );
  }

  const displayName = profile?.full_name || user.email.split("@")[0];
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="userMenu" ref={menuRef}>
      <button
        className="userAvatar"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={displayName}
      >
        {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initial}
      </button>

      {open && (
        <div className="userDropdown" role="menu">
          <div className="userInfo">
            <span className="name">{displayName}</span>
            <span className="email">{user.email}</span>
          </div>

          <Link className="userDropdownItem" to="/profile" onClick={() => setOpen(false)}>
            My account
          </Link>
          <Link className="userDropdownItem" to="/profile" onClick={() => setOpen(false)}>
            Orders
          </Link>
          <Link className="userDropdownItem" to="/wishlist" onClick={() => setOpen(false)}>
            Wishlist
          </Link>

          <button className="userDropdownItem signOut" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
