import { useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";

export default function RegisterSchool() {
  const [schoolName, setSchoolName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

  const navigate = useNavigate();

  async function handleSchoolOnboarding(e) {
    e.preventDefault();
    if (!schoolName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      alert("Please fill in all layout configuration fields.");
      return;
    }

    setLoading(true);

    // 1. Create a clean, short unique code for the school automatically
    // e.g., "RATNA-5421"
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const cleanCode = `${schoolName.toUpperCase().replace(/\s+/g, "").substring(0, 5)}-${randomSuffix}`;

    try {
      // 2. Insert the new school row into the master schools table
      const { data: newSchool, error: schoolError } = await supabase
        .from("schools")
        .insert([{ school_name: schoolName, registration_code: cleanCode }])
        .select()
        .single();

      if (schoolError) throw schoolError;

      // 3. Register the Admin User account inside Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
      });

      if (authError) throw authError;

      const user = authData.user;

      if (user) {
        // 4. Update the admin's profile row to link them to the new school ID and set role
        // This ensures they have administrative master privileges instantly
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ 
            school_id: newSchool.id,
            role: "admin" 
          })
          .eq("id", user.id);

        if (profileError) throw profileError;

        setGeneratedCode(cleanCode);
        alert(`School Registered Successfully! Your entry code is: ${cleanCode}`);
      }

    } catch (err) {
      alert(`Onboarding Configuration Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "40px 20px", fontFamily: "'Segoe UI', sans-serif", maxWidth: "450px", margin: "40px auto", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", textAlign: "left" }}>
      
      <h2 style={{ margin: "0 0 8px 0", color: "#0f172a", fontWeight: "700" }}>Onboard New School Tenant</h2>
      <p style={{ margin: "0 0 25px 0", color: "#64748b", fontSize: "14px" }}>Deploy an isolated, secure database ecosystem instance for your institutional client.</p>

      {generatedCode ? (
        <div style={{ backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
          <span style={{ fontSize: "32px" }}>🎉</span>
          <h3 style={{ color: "#065f46", margin: "10px 0 5px 0" }}>Deployment Operational</h3>
          <p style={{ fontSize: "13.5px", color: "#047857", margin: "0 0 15px 0" }}>Share this unique access token registration key with your school faculty teachers:</p>
          <div style={{ backgroundColor: "#ffffff", border: "1px dashed #059669", padding: "12px", fontSize: "20px", fontWeight: "700", color: "#065f46", letterSpacing: "1px", borderRadius: "6px" }}>
            {generatedCode}
          </div>
          <button 
            onClick={() => navigate("/login")}
            style={{ marginTop: "20px", width: "100%", padding: "10px", backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
          >
            Proceed to System Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSchoolOnboarding} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>Official School Name</label>
            <input 
              type="text" 
              placeholder="e.g., Ratna Square Elite Academy" 
              value={schoolName} 
              onChange={(e) => setSchoolName(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>Master Admin Email Address</label>
            <input 
              type="email" 
              placeholder="principal@school.com" 
              value={adminEmail} 
              onChange={(e) => setAdminEmail(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>System Administrative Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={adminPassword} 
              onChange={(e) => setAdminPassword(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ width: "100%", padding: "12px", backgroundColor: "#1e293b", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", fontSize: "14px", cursor: "pointer", marginTop: "10px" }}
          >
            {loading ? "Provisioning Architecture Cloud..." : "Build Institutional Portal Space"}
          </button>
        </form>
      )}
    </div>
  );
}