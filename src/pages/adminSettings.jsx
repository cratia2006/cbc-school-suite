import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";

export default function AdminSettings() {
  const [schoolId, setSchoolId] = useState(null);
  const [schoolName, setSchoolName] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [classesList, setClassesList] = useState([]);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [newClassName, setNewClassName] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    verifyAdminAndLoadSettings();
  }, []);

  // ================= 1. IDENTITY & TENANT RESOLUTION =================
  async function verifyAdminAndLoadSettings() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      // Pull current admin profile details
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, school_id, schools(school_name, teacher_invite_token)")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || profile.role !== "admin") {
        alert("Access Denied: Settings are restricted to institutional administrators.");
        navigate("/dashboard");
        return;
      }

      const tenantId = profile.school_id;
      setSchoolId(tenantId);
      setSchoolName(profile.schools?.school_name || "Our Institution");
      setInviteToken(profile.schools?.teacher_invite_token || "NOT_SET");

      // Load existing classes for this tenant slice
      await fetchTenantClasses(tenantId);

    } catch (err) {
      console.error("Settings initialization failure:", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTenantClasses(tenantId) {
    const { data } = await supabase
      .from("classes")
      .select("*")
      .eq("school_id", tenantId)
      .order("class_name", { ascending: true });
    
    setClassesList(data || []);
  }

  // ================= 2. MUTATION ENGINE ACTIONS =================
  
  // Handle adding a single class manually
  async function handleAddClass(e) {
    e.preventDefault();
    if (!newClassName.trim() || !schoolId) return;

    setActionLoading(true);
    const { error } = await supabase
      .from("classes")
      .insert([{ class_name: newClassName.trim(), school_id: schoolId }]);
    
    if (error) {
      alert("Error saving class node: " + error.message);
    } else {
      setNewClassName("");
      await fetchTenantClasses(schoolId);
    }
    setActionLoading(false);
  }

  // Handle rotating/regenerating the teacher token dynamically
  async function handleRegenerateToken() {
    if (!schoolId) return;
    
    const confirmChange = window.confirm("Regenerating the access key will invalidate the old code. Proceed?");
    if (!confirmChange) return;

    setActionLoading(true);
    const genericNewToken = `${schoolName.replace(/\s+/g, "").substring(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`.toUpperCase();

    const { error } = await supabase
      .from("schools")
      .update({ teacher_invite_token: genericNewToken })
      .eq("id", schoolId);

    if (error) {
      alert("Token rotation error: " + error.message);
    } else {
      setInviteToken(genericNewToken);
    }
    setActionLoading(false);
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "50px", color: "#64748b", fontFamily: "'Segoe UI', sans-serif" }}>Synchronizing Institutional Control Configurations...</div>;
  }

  return (
    <div style={{ padding: "30px", fontFamily: "'Segoe UI', sans-serif", maxWidth: "1000px", margin: "0 auto", backgroundColor: "#f8fafc", minHeight: "85vh" }}>
      
      {/* SECTION HEADER */}
      <div style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: "15px", marginBottom: "30px", textAlign: "left" }}>
        <h2 style={{ margin: "0 0 5px 0", color: "#1e293b", fontWeight: "700" }}>⚙️ Core System Settings</h2>
        <p style={{ margin: "0", color: "#64748b", fontSize: "14px" }}>Configure operational assets, manage organizational structures, and access security keys for <strong>{schoolName}</strong>.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
        
        {/* LEFT CARD: CLASS & ROSTER MANAGEMENT */}
        <div style={{ backgroundColor: "#ffffff", padding: "25px", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "left" }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#0f172a", fontSize: "16px", fontWeight: "700" }}>Class Structure Registry</h3>
          <p style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: "13px" }}>Create and review the structural class sections active in your ecosystem.</p>

          <form onSubmit={handleAddClass} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input 
              type="text" 
              placeholder="e.g., Grade 6 East, Class 3"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13.5px" }}
            />
            <button type="submit" disabled={actionLoading} style={{ padding: "10px 16px", backgroundColor: "#1e293b", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>
              {actionLoading ? "Saving..." : "+ Add"}
            </button>
          </form>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto" }}>
            {classesList.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "13px", fontStyle: "italic" }}>No custom classes declared yet.</p>
            ) : (
              classesList.map((c) => (
                <div key={c.id} style={{ padding: "10px 14px", backgroundColor: "#f1f5f9", borderRadius: "6px", fontSize: "14px", fontWeight: "600", color: "#334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>🏫 {c.class_name}</span>
                  <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "normal" }}>ID: {c.id.substring(0,8)}...</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT CARD: SECURITY LICENSE CREDENTIALS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={{ backgroundColor: "#ffffff", padding: "25px", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "left" }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#0f172a", fontSize: "16px", fontWeight: "700" }}>Faculty Authorization Token</h3>
            <p style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: "13px" }}>This token allows teachers to securely register themselves directly under your institution domain hierarchy.</p>
            
            <div style={{ background: "#f0fdf4", border: "1px dashed #16a34a", padding: "15px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <div>
                <span style={{ display: "block", fontSize: "10px", color: "#16a34a", fontWeight: "800", letterSpacing: "0.5px" }}>ACTIVE JOIN CODE</span>
                <span style={{ fontSize: "20px", fontWeight: "800", color: "#14532d", letterSpacing: "1px" }}>{inviteToken}</span>
              </div>
              <button onClick={handleRegenerateToken} disabled={actionLoading} style={{ background: "none", border: "1px solid #16a34a", color: "#16a34a", padding: "6px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                Rotate Code 🔄
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: "#ffffff", padding: "25px", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "left" }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#0f172a", fontSize: "15px", fontWeight: "700" }}>Commercial Subscription Status</h3>
            <div style={{ padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", display: "block" }}>Enterprise Tier Instance</span>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Multi-tenant database scaling unlocked.</span>
              </div>
              <span style={{ backgroundColor: "#4f46e5", color: "#fff", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>ACTIVE LICENSE</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}