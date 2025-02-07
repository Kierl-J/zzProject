import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import './App.css';

axios.defaults.baseURL = "http://localhost:3000";
axios.defaults.withCredentials = true;

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute />} />
        </Routes>
      </div>
    </Router>
  );
}

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post("/login", { username, password });
      localStorage.setItem("accessToken", data.accessToken);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="form-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin} className="auth-form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="input-field"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="input-field"
        />
        <button type="submit" className="auth-button">Login</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      <Link to="/register" className="auth-link">Don't have an account? Register</Link>
    </div>
  );
}

function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/register", { username, password });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="form-container">
      <h2>Register</h2>
      <form onSubmit={handleRegister} className="auth-form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="input-field"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="input-field"
        />
        <button type="submit" className="auth-button">Register</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      <Link to="/login" className="auth-link">Already have an account? Login</Link>
    </div>
  );
}

function ProtectedRoute() {
  const [users, setUsers] = useState([]);
  const token = localStorage.getItem("accessToken");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    axios
      .get("/dashboard", { headers: { Authorization: `Bearer ${token}` } })
      .then(() => {
        // Fetch users data from auth_db
        axios
          .get("/users", { headers: { Authorization: `Bearer ${token}` } })
          .then((res) => {
            setUsers(res.data); // Assuming the API provides the user data
          })
          .catch(() => {
            localStorage.removeItem("accessToken");
            navigate("/login");
          });
      })
      .catch(() => {
        localStorage.removeItem("accessToken");
        navigate("/login");
      });
  }, [token]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Dashboard</h2>
        <button
          onClick={async () => {
            await axios.post("/logout");
            localStorage.removeItem("accessToken");
            navigate("/login");
          }}
          className="logout-button"
        >
          Logout
        </button>
      </div>

      <div className="table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>Username</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
