import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function Communication() {
  const [notices, setNotices] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSchoolId, setCurrentSchoolId] = useState(null);
  
  // Enforces role state tracking
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    checkUserRoleAndFetch();
  }, []);

  // 1. Role & Tenant Verification Step: Resolve profile security metadata
  async function checkUserRoleAndFetch() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from("teachers")
          .select("role, school_id")
          .eq("id", user.id)
          .maybeSingle();

        const role = profile?.role || "guest";
        const schoolId = profile?.school_id || null;

        if (profile && role === "teacher") {
          setIsTeacher(true); // Grants layout panel access only if role matched perfectly
        }

        setCurrentSchoolId(schoolId);
        // Execute isolated bulletin fetch tracking this specific school context
        await fetchNotices(schoolId);
      }
    } catch (err) {
      console.error("Context mapping resolution dropped:", err);
    }
  }

  // 2. Parents & Teachers can read notices (Scoped strictly to Active Tenant Space)
  async function fetchNotices(schoolId) {
    let query = supabase
      .from("announcements")
      .select("*")
      .order("id", { ascending: false });

    const activeSchoolId = schoolId !== undefined ? schoolId : currentSchoolId;
    if (activeSchoolId) {
      query = query.eq("school_id", activeSchoolId);
    }

    const { data, error } = await query;

    if (error) {
      console.log("Error loading board updates:", error);
    } else {
      setNotices(data || []);
    }
  }

  // 3. Form Submission hook
  async function handleBroadcast(e) {
    e.preventDefault();

    if (!title || !content) {
      alert("Please provide both a title heading and message body text.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("announcements").insert([
      {
        school_id: currentSchoolId,
        title: title,
        content: content
      }
    ]);

    if (error) {
      console.log("Error committing statement broadcast:", error);
      alert("Transmission error: " + error.message);
      setLoading(false);
    } else {
      setTitle("");
      setContent("");
      await fetchNotices(currentSchoolId);
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "30px", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", maxWidth: "1100px", margin: "0 auto", backgroundColor: "#f8fafc", minHeight: "85vh" }}>
      
      <div style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: "15px", marginBottom: "30px", textAlign: "left" }}>
        <h2 style={{ margin: "0 0 5px 0", color: "#1e293b", fontWeight: "700" }}>School Communication Portal</h2>
        <p style={{ margin: "0", color: "#64748b", fontSize: "14px" }}>Official community broadcast system linked to cloud records.</p>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: isTeacher ? "1fr 1.2fr" : "1fr", 
        gap: "30px" 
      }}>
        
        {/* ================= COLUMN 1: CONTROLS (Only visible to verified Teachers) ================= */}
        {isTeacher && (
          <div style={{ backgroundColor: "#ffffff", padding: "25px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)", height: "fit-content", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <span style={{ backgroundColor: "#ef4444", color: "#fff", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", letterSpacing: "0.5px" }}>ADMIN / TEACHER CONTROLS</span>
            </div>
            <h3 style={{ margin: "0 0 20px 0", color: "#0f172a", fontSize: "18px", textAlign: "left" }}>Create Announcement</h3>
            
            <form onSubmit={handleBroadcast} style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Announcement Heading</label>
                <input
                  type="text"
                  placeholder="e.g., Term 2 Parent-Teacher Consultation Meeting"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Detailed Message Body</label>
                <textarea
                  placeholder="Provide event times, dates, agendas, or specific instructions for guardians..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows="6"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", outline: "none" }}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{ width: "100%", padding: "12px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px", boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)" }}
              >
                {loading ? "Storing in Supabase..." : "🚀 Publish Announcement"}
              </button>
            </form>
          </div>
        )}

        {/* ================= COLUMN 2: LIVE FEED (Always visible to Parents & Teachers) ================= */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", paddingLeft: "5px" }}>
            <span style={{ backgroundColor: "#10b981", color: "#fff", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", letterSpacing: "0.5px" }}>LIVE BULLETIN BOARD</span>
            <h3 style={{ margin: "0", color: "#0f172a", fontSize: "18px" }}>Parents & Teachers Feed</h3>
          </div>

          {notices.length === 0 ? (
            <div style={{ padding: "40px", backgroundColor: "#fff", borderRadius: "12px", border: "1px dashed #cbd5e1", textAlign: "center", color: "#94a3b8" }}>
              <p style={{ margin: "0", fontStyle: "italic" }}>The notice board is currently empty.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "65vh", overflowY: "auto", paddingRight: "5px" }}>
              {notices.map((notice) => (
                <div 
                  key={notice.id} 
                  style={{ backgroundColor: "#ffffff", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", textAlign: "left" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px dashed #f1f5f9", paddingBottom: "10px" }}>
                    <h4 style={{ margin: "0", color: "#1e293b", fontSize: "15px", fontWeight: "600" }}>
                      📢 {notice.title}
                    </h4>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "500" }}>
                      Official Notice
                    </span>
                  </div>
                  <p style={{ margin: "0", color: "#475569", fontSize: "13.5px", lineHeight: "1.6", whiteSpace: "pre-line" }}>
                    {notice.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}