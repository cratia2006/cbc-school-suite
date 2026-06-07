import { useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); 
  const [role, setRole] = useState("parent"); // Defaults to parent role selection
  const [schoolCode, setSchoolCode] = useState(""); // Stores the entered school code
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSignup(e) {
    e.preventDefault();
    if (!email || !password || !fullName) {
      alert("Please fill in all fields");
      return;
    }

    // If registering as a teacher, make sure they supplied a school registration code
    if (role === "teacher" && !schoolCode.trim()) {
      alert("Please provide a valid School Access Registration Code.");
      return;
    }

    setLoading(true);
    let verifiedSchoolId = null;

    try {
      // 1. If registering as a teacher, verify that the school code exists in the database
      if (role === "teacher") {
        const { data: schoolData, error: schoolError } = await supabase
          .from("schools")
          .select("id")
          .eq("registration_code", schoolCode.trim().toUpperCase())
          .maybeSingle();

        if (schoolError || !schoolData) {
          alert("Registration Error: The provided School Registration Code is invalid.");
          setLoading(false);
          return;
        }
        
        // Save the valid school UUID to link it to the teacher's profile row later
        verifiedSchoolId = schoolData.id;
      }

      // 2. Create the secure authentication login account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName, 
          },
        },
      });

      if (authError) throw authError;

      // 3. Explicitly attach data variables and the verified school_id to your teachers table
      if (authData?.user) {
        const { error: profileError } = await supabase
          .from("teachers")
          .insert([
            {
              id: authData.user.id,
              email: email,
              full_name: fullName,
              role: role, // Saves 'teacher' or 'parent'
              school_id: verifiedSchoolId // Links explicitly to their school container (or null for parents)
            }
          ]);

        if (profileError) throw profileError;
      }

      setLoading(false);
      alert("Registration complete! Redirecting to login page.");
      navigate("/login");

    } catch (err) {
      console.log("Signup configuration error:", err.message);
      alert("Signup failed: " + err.message);
      setLoading(false);
    }
  }

  return (
    <div style={{ textAlign: "center", padding: "40px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "350px", margin: "0 auto", padding: "25px", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#fff" }}>
        <h2>School Suite Registration</h2>
        <p style={{ color: "#666", fontSize: "14px" }}>Create your account to access your dashboard</p>

        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px", textAlign: "left" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "#444" }}>Full Name</label>
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box", marginTop: "4px" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "#444" }}>Email Address</label>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box", marginTop: "4px" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "#444" }}>Password</label>
            <input
              type="password"
              placeholder="Password (Min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box", marginTop: "4px" }}
            />
          </div>

          {/* Account Role Selector dropdown */}
          <div>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "#444" }}>Register Account As:</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box", marginTop: "4px" }}
            >
              <option value="parent">Parent / Guardian (View Only Access)</option>
              <option value="teacher">Teacher / Administrator (Full Edit Access)</option>
            </select>
          </div>

          {/* DYNAMIC FIELD: Renders only if the user selects the Teacher role */}
          {role === "teacher" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>School Access Registration Code</label>
              <input
                type="text"
                placeholder="e.g., RATNA-1234"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "2px solid #b4fee7", backgroundColor: "#f0fdf4", boxSizing: "border-box", marginTop: "4px", fontWeight: "600", color: "#065f46", outline: "none" }}
              />
              <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#059669" }}>Get this code from your school head administrator.</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: "10px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", marginTop: "10px" }}
          >
            {loading ? "Registering..." : "Sign Up"}
          </button>
        </form>

        <p style={{ marginTop: "15px", fontSize: "14px" }}>
          Already have an account? <Link to="/login" style={{ color: "#0066cc" }}>Log In</Link>
        </p>
      </div>
    </div>
  );
}