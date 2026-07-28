import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import Home from "./pages/Home/Home";
import Products from "./pages/Products/Products";
import Product from "./pages/Product/Product";
import Search from "./pages/Search/Search";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import AuthCallback from "./pages/AuthCallback/AuthCallback";
import Profile from "./pages/Profile/Profile";
import Navbar from "./components/Navebar/Navbar";
import Footer from "./components/Footer/Footer";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import useCartSync from "./hooks/useCartSync";
import "./App.scss";

// Sits inside the providers (so it can read auth) but outside the routes (so
// the cart keeps syncing as the user navigates).
const Layout = () => {
  useCartSync();

  return (
    <div className="app">
      <Navbar />
      <Outlet />
      <Footer />
    </div>
  );
};

// Defined at module scope, not inside App(): a router recreated on every render
// would remount every page and lose their state.
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/products/:id", element: <Products /> },
      { path: "/product/:id", element: <Product /> },
      { path: "/search", element: <Search /> },

      // Public auth screens.
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "/auth/callback", element: <AuthCallback /> },

      // Signed-in only. /orders and /wishlist are the same page on another tab.
      {
        path: "/profile",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "/orders",
        element: (
          <ProtectedRoute>
            <Profile defaultTab="orders" />
          </ProtectedRoute>
        ),
      },
      {
        path: "/wishlist",
        element: (
          <ProtectedRoute>
            <Profile defaultTab="wishlist" />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

function App() {
  // AuthProvider must wrap WishlistProvider — the wishlist loads per user.
  return (
    <AuthProvider>
      <WishlistProvider>
        <RouterProvider router={router} />
      </WishlistProvider>
    </AuthProvider>
  );
}

export default App;
