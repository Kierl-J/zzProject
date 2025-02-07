import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import axios from "axios";
import Login from "./components/Login";
import Register from "./components/Register";

axios.defaults.baseURL = "http://localhost:3000";
axios.defaults.withCredentials = true;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute />} />
      </Routes>
    </Router>
  );
}



//dashboard inside ProtectedRoute
function ProtectedRoute() {
  const [message, setMessage] = useState("");
  const token = localStorage.getItem("accessToken");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/")
      return;
    }
    axios
      .get("/dashboard", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setMessage(res.data.message))
      .catch(() => {
        localStorage.removeItem("accessToken");
        navigate("/")
      });
  }, [token]);

  return (
    <div>
      <h2>Dashboard</h2>
      <p>{message}</p>
      <button
        onClick={async () => {
          await axios.post("/logout");
          localStorage.removeItem("accessToken");
          navigate("/");
        }}
      >
        Logout
      </button>
    </div>
  );
}

export default App;
