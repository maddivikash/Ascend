import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { getAccessToken } from "./api/client";
import Landing from "./pages/Landing";
import Blog from "./pages/Blog";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import GoalDetail from "./pages/GoalDetail";
import Profile from "./pages/Profile";
import Activity from "./pages/Activity";
import Admin from "./pages/Admin";

/** "/" is public: logged-out visitors get the landing page, signed-in users the app. */
function RootGate() {
  const { pathname } = useLocation();
  // Signed out: the home page is the landing page; any deeper link goes to login.
  if (!getAccessToken()) return pathname === "/" ? <Landing /> : <Navigate to="/login" replace />;
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<Blog />} />
      <Route path="/" element={<RootGate />}>
        <Route index element={<Dashboard />} />
        <Route path="goals/:id" element={<GoalDetail />} />
        <Route path="profile" element={<Profile />} />
        <Route path="activity" element={<Activity />} />
        <Route path="admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
