import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Matching from './pages/Matching';
import Messages from './pages/Messages';
import Members from './pages/Members';
import Events from './pages/Events';
import Courses from './pages/Courses';
import Inspiration from './pages/Inspiration';
import AdminDashboard from './pages/AdminDashboard';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="matching" element={<Matching />} />
        <Route path="messages" element={<Messages />} />
        <Route path="members" element={<Members />} />
        <Route path="inspiration" element={<Inspiration />} />
        <Route path="events" element={<Events />} />
        <Route path="courses" element={<Courses />} />
        {user?.role === 'Admin' && (
          <Route path="admin" element={<AdminDashboard />} />
        )}
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;



