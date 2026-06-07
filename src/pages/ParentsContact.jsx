import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function ParentsContact() {
  const [students, setStudents] = useState([]);
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentSchoolId, setCurrentSchoolId] = useState(null);

  // Search filter index
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    initializeCommsRegistry();
  }, []);

  async function initializeCommsRegistry() {
    setLoading(true);
    await checkUserRoleAndFetch();
    setLoading(false);
  }

  // 1. Strict Security Layer aligned perfectly with ClassManagement context
  async function checkUserRoleAndFetch() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Core profile credentials matrix check
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, school_id")
          .eq("id", user.id)
          .maybeSingle();

        // Structural teacher assignment registry fallback check
        const { data: teacherProfile } = await supabase
          .from("teachers")
          .select("role, school_id")
          .eq("id", user.id)
          .maybeSingle();

        const userRole = (profile?.role || teacherProfile?.role || "guest").toLowerCase();
        const schoolId = profile?.school_id || teacherProfile?.school_id || null;
        
        if (userRole === "teacher" || userRole === "admin") {
          setIsTeacher(true);
        }

        setCurrentSchoolId(schoolId);
        // Instantly invoke filtered fetch bound to resolved school workspace
        await fetchStudentsWithGuardians(schoolId);
      }
    } catch (err) {
      console.error("Credentials evaluation exception:", err);
    }
  }

  // 2. Fetch data directly from updated students table mapping (Scoped to Tenant Space)
  async function fetchStudentsWithGuardians(schoolId) {
    try {
      let query = supabase
        .from("students")
        .select("id, full_name, admission_no, parent_name, parent_phone")
        .order("full_name", { ascending: true });

      const activeSchoolId = schoolId !== undefined ? schoolId : currentSchoolId;
      if (activeSchoolId) {
        query = query.eq("school_id", activeSchoolId);
      }

      const { data, error } = await query;

      if (!error) {
        setStudents(data || []);
      } else {
        console.error("Data tracking discrepancy:", error.message);
      }
    } catch (err) {
      console.error("Data syncing malfunction:", err);
    }
  }

  function handlePrintDirectory() {
    window.print();
  }

  // 3. Live Computational Filter Pipeline
  const filteredDirectory = students.filter(student => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      student.full_name?.toLowerCase().includes(query) ||
      student.admission_no?.toLowerCase().includes(query) ||
      student.parent_name?.toLowerCase().includes(query)
    );
  });

  // Derived Operational Metrics
  const validContacts = students.filter(s => s.parent_name && s.parent_name !== "Not Disclosed");
  const totalContacts = validContacts.length;
  const standardMobiles = validContacts.filter(s => s.parent_phone && s.parent_phone !== "Not Disclosed" && s.parent_phone.trim().length >= 9).length;

  return (
    <div style={{ padding: "30px", fontFamily: "'Segoe UI', sans-serif", maxWidth: "1250px", margin: "0 auto", backgroundColor: "#f8fafc", minHeight: "85vh" }}>
      
      {/* BULLETPROOF PRINT ENGINE OVERRIDE */}
      <style>{`
        @media print {
          body * { 
            visibility: hidden !important; 
          }
          .print-container, .print-container * { 
            visibility: visible !important; 
          }
          .print-container { 
            display: block !important;
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          body { background: #fff !important; padding: 0 !important; margin: 0 !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      `}</style>

      {/* Screen view dashboard title */}
      <div className="no-print" style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: "15px", marginBottom: "30px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: "0 0 5px 0", color: "#1e293b", fontWeight: "700" }}>Emergency Communications Registry</h2>
          <p style={{ margin: "0", color: "#64748b", fontSize: "14px" }}>Isolate individual learner files, search guardian metadata records, or extract master phone listings.</p>
        </div>
        <span style={{ backgroundColor: isTeacher ? "#0f172a" : "#cbd5e1", color: isTeacher ? "#ffffff" : "#334155", padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", letterSpacing: "0.5px" }}>
          {isTeacher ? "🔒 SECURE FACULTY INTERFACE ACTIVE" : "👁️ READ-ONLY DIRECTORY VIEW"}
        </span>
      </div>

      {totalContacts > 0 && (
        <div className="no-print" style={{ textAlign: "left", marginBottom: "20px" }}>
          <button 
            onClick={handlePrintDirectory} 
            style={{ padding: "12px 26px", backgroundColor: "#059669", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 12px rgba(5, 150, 105, 0.2)", fontSize: "14px" }}
          >
            📥 Download Official Contacts Ledger (PDF)
          </button>
        </div>
      )}

      {/* MAIN WORKSPACE GRID */}
      <div className="no-print" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "30px" }}>
        
        {/* ================= COLUMN 1: DYNAMIC SEARCH PANEL & METRICS ================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* SEARCH INSTRUMENT */}
          <div style={{ backgroundColor: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", textAlign: "left" }}>
            <h4 style={{ margin: "0 0 12px 0", color: "#0f172a", fontWeight: "700", fontSize: "15px" }}>Search Comms Database</h4>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f1f5f9", padding: "10px 14px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
              <span style={{ fontSize: "16px" }}>🔍</span>
              <input 
                type="text" 
                placeholder="Search by student, admission, or parent..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", border: "none", fontSize: "13.5px", fontWeight: "500", color: "#1e293b", outline: "none", backgroundColor: "transparent" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontWeight: "700", fontSize: "11px" }}>RESET</button>
              )}
            </div>
          </div>

          {/* METRIC CARD STACKS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div style={{ background: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: "700", letterSpacing: "0.5px" }}>CONFIGURED GUARDIANS</span>
              <span style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", display: "block", marginTop: "4px" }}>{totalContacts}</span>
            </div>
            <div style={{ background: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: "700", letterSpacing: "0.5px" }}>ROUTABLE MOBILE LINES</span>
              <span style={{ fontSize: "24px", fontWeight: "800", color: "#10b981", display: "block", marginTop: "4px" }}>{standardMobiles}</span>
            </div>
          </div>

          <div style={{ padding: "15px 20px", background: "#fff7ed", border: "1px solid #ffedd5", borderRadius: "10px", color: "#c2410c", fontSize: "13px", fontWeight: "500", textAlign: "left" }}>
            💡 <strong>Directory Automation System:</strong> Guardian profiles are dynamically linked to student files. To modify a parent name or contact number, update the profile inside the <strong>Student Directory Desk</strong>.
          </div>
        </div>

        {/* ================= COLUMN 2: LIVE STREAM VIEW DIRECTORY ================= */}
        <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
          
          <div style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <h3 style={{ margin: "0 0 15px 0", color: "#0f172a", fontSize: "15px", fontWeight: "700", borderBottom: "2px solid #ea580c", paddingBottom: "8px" }}>
              📖 ACTIVE COMMUNICATIONS ROLODEX ({filteredDirectory.length})
            </h3>

            {loading ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b", fontStyle: "italic", fontSize: "13.5px" }}>Refreshing Live Registry Maps...</div>
            ) : filteredDirectory.length === 0 ? (
              <div style={{ padding: "50px 0", textAlign: "center", color: "#94a3b8" }}>
                <p style={{ margin: "0", fontStyle: "italic", fontSize: "13.5px" }}>No communication records match the active parameter search thresholds.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "60vh", overflowY: "auto", paddingRight: "4px" }}>
                {filteredDirectory.map((student) => {
                  const hasGuardian = student.parent_name && student.parent_name !== "Not Disclosed";
                  
                  return (
                    <div key={student.id} style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "15px", fontWeight: "700", color: hasGuardian ? "#0f172a" : "#94a3b8" }}>
                          👤 {hasGuardian ? student.parent_name : "Guardian Information Missing"}
                        </span>
                        <div style={{ marginTop: "4px", fontSize: "12px", color: "#64748b" }}>
                          Learner Target: <strong style={{ color: "#334155" }}>{student.full_name}</strong> | 
                          <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", marginLeft: "5px", fontWeight: "600" }}>
                            ADM NO: {student.admission_no}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        {student.parent_phone && student.parent_phone !== "Not Disclosed" ? (
                          <span style={{ fontSize: "14px", fontWeight: "700", color: "#2563eb", fontFamily: "monospace", background: "#eff6ff", padding: "6px 12px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                            📞 {student.parent_phone}
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: "600", background: "#fef2f2", padding: "4px 8px", borderRadius: "4px", border: "1px solid #fecaca" }}>
                            ⚠️ Line Missing
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ================= PREMIUM OFFICIAL A4 DOCUMENT PRINT OVERLAY ================= */}
      {filteredDirectory.length > 0 && (
        <div className="print-container" style={{ display: "none", backgroundColor: "#fff", padding: "35px", textAlign: "left" }}>
          
          <div style={{ textAlign: "center", marginBottom: "25px", borderBottom: "3px double #000", paddingBottom: "15px" }}>
            <h2 style={{ margin: "0 0 5px 0", fontWeight: "800", fontSize: "24px", letterSpacing: "1px", color: "#000" }}>CBC SCHOOL SUITE ACADEMY</h2>
            <h4 style={{ margin: "0 0 12px 0", color: "#333", textTransform: "uppercase", fontSize: "12px", letterSpacing: "1px", fontWeight: "600" }}>Institutional Communications Registry</h4>
            <div style={{ display: "inline-block", backgroundColor: "#000", color: "#fff", padding: "5px 16px", borderRadius: "3px", fontSize: "11px", fontWeight: "bold" }}>
              OFFICIAL EMERGENCY PARENT-LEARNER CONTACT DIRECTORY
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", marginBottom: "25px", fontSize: "13px" }}>
            <p style={{ margin: 0 }}><strong>Department Entity:</strong> Administration Desk</p>
            <p style={{ margin: 0 }}><strong>Total Configured Records:</strong> {totalContacts} Systemic Links Active</p>
            <p style={{ margin: 0 }}><strong>Active Communications Channels:</strong> Verified Mobiles: {standardMobiles} Lines</p>
            <p style={{ margin: 0 }}><strong>Data Extraction Date:</strong> {new Date().toLocaleDateString()}</p>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "40px" }}>
            <thead>
              <tr style={{ backgroundColor: "#0f172a", color: "#fff", border: "1px solid #000" }}>
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px" }}>Student Learner Name</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", width: "120px" }}>Admission No</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px" }}>Primary Contact Guardian</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", width: "160px" }}>Phone Line</th>
              </tr>
            </thead>
            <tbody>
              {filteredDirectory.map((student) => (
                <tr key={student.id} style={{ borderBottom: "1px solid #000" }}>
                  <td style={{ padding: "10px 8px", fontSize: "12px", fontWeight: "600" }}>{student.full_name}</td>
                  <td style={{ padding: "10px 8px", fontSize: "12px" }}>{student.admission_no || "N/A"}</td>
                  <td style={{ padding: "10px 8px", fontSize: "12px", fontWeight: "500" }}>{student.parent_name || "—"}</td>
                  <td style={{ padding: "10px 8px", fontSize: "12px", fontFamily: "monospace" }}>{student.parent_phone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", marginTop: "80px" }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ height: "40px", borderBottom: "1px dashed #000", width: "85%" }}></div>
              <p style={{ margin: "8px 0 0 0", fontSize: "12px", fontWeight: "700" }}>Registrar Operations Signature</p>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ height: "40px", borderBottom: "1px dashed #000", width: "85%", position: "relative" }}>
                <div style={{ position: "absolute", right: "15px", bottom: "-5px", border: "1.5px dashed #000", padding: "3px 8px", fontSize: "9px", textTransform: "uppercase", transform: "rotate(-2deg)", fontWeight: "bold" }}>Confidential Directory</div>
              </div>
              <p style={{ margin: "8px 0 0 0", fontSize: "12px", fontWeight: "700" }}>Internal School Stamp Block</p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}