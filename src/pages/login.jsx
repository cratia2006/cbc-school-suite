import { useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);

    // Supabase built-in Authentication Login call
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    setLoading(false);

    if (error) {
      console.log("Login error:", error.message);
      alert("Login failed: " + error.message);
    } else {
      alert("Welcome back! Login successful.");
      navigate("/"); // Redirects directly to the dashboard home page
    }
  }

  return (
    <div style={{ textAlign: "center", padding: "40px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "350px", margin: "0 auto", padding: "25px", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#fff" }}>
        <h2>Teacher Login</h2>
        <p style={{ color: "#666", fontSize: "14px" }}>Sign in to manage your students and metrics</p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px" }}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: "10px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p style={{ marginTop: "15px", fontSize: "14px" }}>
          Don't have an account yet? <Link to="/signup" style={{ color: "#0066cc" }}>Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
