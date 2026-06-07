import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

export default function Navbar() {
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleNavLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  // Base interactive link styling block
  const linkBaseStyle = {
    textDecoration: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    transition: "background-color 0.2s, color 0.2s",
  };

  return (
    <nav className="portal-navbar" style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "12px 20px" }}>
      
      {/* INJECTED RESPONSIVE OVERRIDES */}
      <style>{`
        .portal-navbar {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          font-family: 'Segoe UI', sans-serif;
          font-size: 14px;
        }
        
        .nav-link-item {
          color: #475569;
          fontWeight: 500;
        }
        .nav-link-item:hover {
          background-color: #f1f5f9;
          color: #0f172a;
        }

        .auth-cluster {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* Mobile Layout optimization engine */
        @media (max-width: 868px) {
          .portal-navbar {
            justify-content: space-evenly !important;
            gap: 8px 4px !important;
            padding: 14px 10px !important;
          }
          .nav-link-item {
            padding: 8px 10px !important;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            flex-grow: 1;
            text-align: center;
            min-width: 120px;
          }
          .nav-divider {
            display: none !important;
          }
          .auth-cluster {
            width: 100%;
            justify-content: center;
            margin-top: 6px;
            padding-top: 10px;
            border-top: 1px dashed #e2e8f0;
          }
        }
      `}</style>

      {/* CORE APPLICATION NAVIGATION LINKS */}
      <Link to="/" className="nav-link-item" style={{ ...linkBaseStyle, fontWeight: "500" }}>Dashboard</Link>
      <Link to="/students" className="nav-link-item" style={{ ...linkBaseStyle, fontWeight: "500" }}>Students</Link>
      <Link to="/assessments" className="nav-link-item" style={{ ...linkBaseStyle, fontWeight: "500" }}>Assessments</Link>
      <Link to="/reports" className="nav-link-item" style={{ ...linkBaseStyle, fontWeight: "500" }}>Reports</Link>
      <Link to="/lesson-plans" className="nav-link-item" style={{ ...linkBaseStyle, fontWeight: "500" }}>Lesson Plans</Link>
      <Link to="/communication" className="nav-link-item" style={{ ...linkBaseStyle, fontWeight: "500" }}>Communication</Link>
      <Link to="/parents-contact" className="nav-link-item" style={{ ...linkBaseStyle, fontWeight: "500" }}>Parents Directory</Link>
      <Link to="/homework" className="nav-link-item" style={{ ...linkBaseStyle, color: "#4f46e5", fontWeight: "600", border: "1px solid #e0e7ff", backgroundColor: "#f5f3ff" }}>Homework Portal</Link>
      <Link to="/class-management" className="nav-link-item" style={{ ...linkBaseStyle, color: "#0f172a", fontWeight: "600", border: "1px solid #cbd5e1" }}>Classes Hub</Link>
      
      <span className="nav-divider" style={{ color: "#cbd5e1", margin: "0 4px" }}>|</span>

      {/* SECURE IDENTITY SESSIONS LINKS STATUS */}
      <div className="auth-cluster">
        {!session ? (
          <>
            <Link to="/login" style={{ ...linkBaseStyle, color: "#10b981", fontWeight: "700" }}>Login</Link>
            <Link to="/signup" style={{ ...linkBaseStyle, color: "#2563eb", fontWeight: "700" }}>Sign Up</Link>
          </>
        ) : (
          <>
            <span style={{ color: "#475569", fontSize: "12px", backgroundColor: "#f1f5f9", padding: "5px 10px", borderRadius: "20px", fontWeight: "600", border: "1px solid #e2e8f0", display: "inline-flex", alignItems: "center" }}>
              🟢 Secure Session
            </span>
            <button 
              onClick={handleNavLogout}
              style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#ef4444", fontWeight: "700", cursor: "pointer", fontSize: "13px", padding: "6px 14px", borderRadius: "6px", transition: "all 0.2s" }}
              onMouseOver={(e) => { e.currentTarget.style.background = "#fee2e2" }}
              onMouseOut={(e) => { e.currentTarget.style.background = "#fef2f2" }}
            >
              Log Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}