import { useState, useEffect } from 'react'
import './App.css'
import TimeTracker from './components/TimeTracker'
import Login from './components/Login'
import Register from './components/Register'
import { verifyToken } from './services/api'

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  // Check for token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { user } = await verifyToken(token);
          setUser(user);
          setIsAuthenticated(true);
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = (token: string, user: User, rememberMe: boolean) => {
    if (rememberMe) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    setUser(user);
    setIsAuthenticated(true);
  };

  const handleRegister = (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (isLoading) {
    return (
      <div className="app loading">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="app">
      {!isAuthenticated ? (
        showRegister ? (
          <Register
            onRegister={handleRegister}
            onSwitchToLogin={() => setShowRegister(false)}
          />
        ) : (
          <Login
            onLogin={handleLogin}
            onSwitchToRegister={() => setShowRegister(true)}
          />
        )
      ) : (
        <>
          <header className="app-header">
            <h1>TimeDoctor</h1>
            <div className="user-info">
              <span>{user?.email}</span>
              <button 
                onClick={handleLogout}
                className="logout-button"
              >
                Logout
              </button>
            </div>
          </header>
          <TimeTracker />
        </>
      )}
    </div>
  )
}

export default App
