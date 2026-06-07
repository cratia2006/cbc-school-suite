import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentSchoolId, setCurrentSchoolId] = useState(null); // Keeps track of which school is active

  // Search Engine State Register
  const [searchQuery, setSearchQuery] = useState("");

  // Form input states
  const [admissionNo, setAdmissionNo] = useState("");
  const [fullName, setFullName] = useState("");
  const [grade, setGrade] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initializeDirectory();
  }, []);

  async function initializeDirectory() {
    setLoading(true);
    // Fetch user context first to grab their school ID reference point
    const userSchoolId = await checkUserRoleAndGetSchool();
    await fetchInitialData(userSchoolId);
    setLoading(false);
  }

  // 1. Structural Security Layer matching Class Management rules + Grabs multi-tenant School ID
  async function checkUserRoleAndGetSchool() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Look inside profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, school_id")
          .eq("id", user.id)
          .maybeSingle();

        // Look inside teachers
        const { data: teacherProfile } = await supabase
          .from("teachers")
          .select("role, school_id")
          .eq("id", user.id)
          .maybeSingle();

        const userRole = (profile?.role || teacherProfile?.role || "guest").toLowerCase();
        const schoolId = profile?.school_id || teacherProfile?.school_id || null;
        
        setCurrentSchoolId(schoolId);

        if (userRole === "teacher" || userRole === "admin") {
          setIsTeacher(true);
        }
        return schoolId;
      }
    } catch (err) {
      console.error("Credentials evaluation exception:", err);
    }
    return null;
  }

  // 2. Hydrate data vectors utilizing graph relational layouts restricted strictly by School ID
  async function fetchInitialData(schoolId) {
    try {
      // Base queries
      let classesQuery = supabase.from("classes").select("*").order("class_name", { ascending: true });
      let teachersQuery = supabase.from("teachers").select("full_name, class_id");
      let studentsQuery = supabase.from("students").select("*").order("full_name", { ascending: true });

      // Apply data isolation filters if a valid school context is found
      if (schoolId) {
        classesQuery = classesQuery.eq("school_id", schoolId);
        teachersQuery = teachersQuery.eq("school_id", schoolId);
        studentsQuery = studentsQuery.eq("school_id", schoolId);
      }

      const { data: cls } = await classesQuery;
      const { data: tch } = await teachersQuery;
      const { data: std } = await studentsQuery;

      setClassesList(cls || []);
      setTeachers(tch || []);
      setStudents(std || []);
    } catch (err) {
      console.error("Data syncing malfunction:", err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isTeacher) return;

    if (!admissionNo.trim() || !fullName.trim() || !grade.trim() || !selectedClassId) {
      alert("Validation Alert: Please populate all baseline field markers before committing.");
      return;
    }

    setSubmitting(true);
    
    // Insert new student and stamp them with the active school_id token
    const { error } = await supabase
      .from("students")
      .insert([
        { 
          admission_no: admissionNo.trim().toUpperCase(), 
          full_name: fullName.trim(), 
          grade: grade.trim(), 
          class_id: selectedClassId,
          parent_name: parentName.trim() || "Not Disclosed",
          parent_phone: parentPhone.trim() || "Not Disclosed",
          school_id: currentSchoolId // Safely binds this student node to the school
        }
      ]);
      
    setSubmitting(false);

    if (error) {
      alert("Error committing student node structure: " + error.message);
    } else {
      setAdmissionNo(""); 
      setFullName(""); 
      setGrade(""); 
      setSelectedClassId("");
      setParentName("");
      setParentPhone("");
      
      // Refresh local directory data map strictly for this school instance
      let refreshQuery = supabase.from("students").select("*").order("full_name", { ascending: true });
      if (currentSchoolId) {
        refreshQuery = refreshQuery.eq("school_id", currentSchoolId);
      }
      const { data } = await refreshQuery;
      setStudents(data || []);
    }
  }

  async function handleDelete(id) {
    if (!isTeacher) return;
    if (!window.confirm("CRITICAL ARCHIVAL WARNING: Sever this student account map from the cloud registry permanently?")) return;

    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) {
      alert("Deletions locked: " + error.message);
    } else {
      setStudents(prev => prev.filter(s => s.id !== id));
    }
  }

  // 3. Live Computational Filter Pipeline
  const filteredStudents = students.filter(student => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    return (
      student.full_name?.toLowerCase().includes(query) ||
      student.admission_no?.toLowerCase().includes(query)
    );
  });

  return (
    <div style={{ padding: "30px", fontFamily: "'Segoe UI', sans-serif", maxWidth: "1200px", margin: "0 auto", backgroundColor: "#f8fafc", minHeight: "85vh" }}>
      
      {/* PROFESSIONAL TITLE INFRASTRUCTURE */}
      <div style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: "15px", marginBottom: "30px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: "0 0 5px 0", color: "#1e293b", fontWeight: "700" }}>Learner Directory Core</h2>
          <p style={{ margin: "0", color: "#64748b", fontSize: "14px" }}>Register new profiles, lookup guardian info cards, or isolate individual academic rosters.</p>
        </div>
        <span style={{ backgroundColor: isTeacher ? "#1e293b" : "#e2e8f0", color: isTeacher ? "white" : "#475569", padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
          {isTeacher ? "🔒 Administrative Control Clearance Active" : "👁️ Viewer Mode (Read-Only Matrix)"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr", gap: "30px" }}>
        
        {/* ================= COLUMN 1: FORM INITIALIZATION DESK ================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {isTeacher ? (
            <div style={{ backgroundColor: "#fff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", textAlign: "left", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <h4 style={{ margin: "0 0 18px 0", color: "#0f172a", fontWeight: "700", fontSize: "15px" }}>Enroll New Student</h4>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", display: "block", marginBottom: "5px" }}>LINK CLASS SYSTEM:</label>
                  <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13.5px", color: "#1e293b", outline: "none" }}>
                    <option value="">-- Choose Target Stream --</option>
                    {classesList.map(cls => <option key={cls.id} value={cls.id}>{cls.class_name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", display: "block", marginBottom: "5px" }}>OFFICIAL IDENTIFIER CODE:</label>
                  <input type="text" placeholder="e.g., ADM-0024" value={admissionNo} onChange={(e) => setAdmissionNo(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13.5px", boxSizing: "border-box", outline: "none" }} />
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", display: "block", marginBottom: "5px" }}>LEARNER FULL NAME:</label>
                  <input type="text" placeholder="Firstname Middlename Surname" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13.5px", boxSizing: "border-box", outline: "none" }} />
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", display: "block", marginBottom: "5px" }}>GRADE MATRIX LEVEL:</label>
                  <input type="text" placeholder="e.g., Grade 4, Form 1" value={grade} onChange={(e) => setGrade(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13.5px", boxSizing: "border-box", outline: "none" }} />
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", display: "block", marginBottom: "5px" }}>PARENT / GUARDIAN FULL NAME:</label>
                  <input type="text" placeholder="Parent Guardian Name" value={parentName} onChange={(e) => setParentName(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13.5px", boxSizing: "border-box", outline: "none" }} />
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", display: "block", marginBottom: "5px" }}>PARENT CONTACT PHONE:</label>
                  <input type="text" placeholder="e.g., 07XXXXXXXX" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13.5px", boxSizing: "border-box", outline: "none" }} />
                </div>

                <button type="submit" disabled={submitting} style={{ marginTop: "5px", padding: "12px", backgroundColor: "#1e293b", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "14px", transition: "background 0.2s" }}>
                  {submitting ? "Writing Registry Block..." : "Save Learner Profile"}
                </button>
              </form>
            </div>
          ) : (
            <div style={{ padding: "15px 20px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", color: "#16a34a", fontSize: "13.5px", fontWeight: "600", textAlign: "left", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
              ℹ️ Portal System Update: You are currently navigating indices in directory view mode. If you require registration access clearance, please contact system administration.
            </div>
          )}
        </div>

        {/* ================= COLUMN 2: SEARCH HUB AND INFO MATRIX ================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* DYNAMIC SEARCH CONSOLE BAR */}
          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "15px", textAlign: "left" }}>
            <span style={{ fontSize: "20px" }}>🔍</span>
            <input 
              type="text" 
              placeholder="Type student name or admission number to search instantly..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "8px 4px", border: "none", fontSize: "14px", fontWeight: "500", color: "#0f172a", outline: "none", backgroundColor: "transparent" }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontWeight: "700", fontSize: "12px" }}>CLEAR</button>
            )}
          </div>

          {/* LIST MATRIX LAYOUT CONTAINER */}
          <div style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "12px", border: "1px solid #e2e8f0", textAlign: "left", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <h4 style={{ margin: "0 0 15px 0", color: "#0f172a", fontWeight: "700", fontSize: "15px", borderBottom: "2px solid #64748b", paddingBottom: "8px" }}>
              DATABASE MATCH MATRIX ({filteredStudents.length})
            </h4>

            {loading ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b", fontStyle: "italic", fontSize: "13.5px" }}>Syncing Live Institutional Database Maps...</div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>⚠️</div>
                <p style={{ margin: "0", fontStyle: "italic", fontSize: "13.5px" }}>No matching profile nodes found across active records directory parameters.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredStudents.map((student) => {
                  const currentClass = classesList.find(c => c.id === student.class_id);
                  const assignedTeacher = teachers.find(t => t.class_id === student.class_id);

                  return (
                    <div key={student.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", boxShadow: "0 1px 2px rgba(0,0,0,0.01)" }}>
                      
                      {/* Left Informational Structural Tree */}
                      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "15px", width: "88%" }}>
                        <div>
                          <span style={{ fontSize: "10.5px", background: "#f1f5f9", padding: "3px 8px", borderRadius: "4px", fontWeight: "700", color: "#475569", display: "inline-block", marginBottom: "6px" }}>
                            REG NO: {student.admission_no}
                          </span>
                          <h5 style={{ margin: "0 0 6px 0", fontSize: "15.5px", fontWeight: "700", color: "#0f172a" }}>{student.full_name}</h5>
                          <p style={{ margin: "0", fontSize: "13px", color: "#475569" }}>
                            🏫 Class: <strong style={{ color: "#0f172a" }}>{currentClass ? currentClass.class_name : "Unmapped Stream"}</strong> ({student.grade || "N/A"})
                          </p>
                          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#475569" }}>
                            👤 Instructor: <span style={{ color: "#4f46e5", fontWeight: "600" }}>{assignedTeacher ? assignedTeacher.full_name : "No Assigned Instructor"}</span>
                          </p>
                        </div>

                        {/* Right Contact Grid Vector Card */}
                        <div style={{ borderLeft: "2px dashed #f1f5f9", paddingLeft: "15px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                          <span style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8", display: "block", marginBottom: "3px", letterSpacing: "0.5px" }}>GUARDIAN OVERVIEW</span>
                          <p style={{ margin: "0", fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>💼 {student.parent_name || "Not Logged"}</p>
                          <p style={{ margin: "3px 0 0 0", fontSize: "13px", color: "#0ea5e9", fontWeight: "700" }}>📞 {student.parent_phone || "No Active Phone"}</p>
                        </div>
                      </div>

                      {/* Destructive Modification Path (Locked safely behind role gate) */}
                      {isTeacher && (
                        <button 
                          onClick={() => handleDelete(student.id)}
                          style={{ padding: "6px 12px", backgroundColor: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer", fontSize: "11.5px", fontWeight: "700", transition: "all 0.15s" }}
                          onMouseOver={(e) => { e.target.style.backgroundColor = "#ef4444"; e.target.style.color = "#fff"; }}
                          onMouseOut={(e) => { e.target.style.backgroundColor = "#fef2f2"; e.target.style.color = "#ef4444"; }}
                        >
                          Purge
                        </button>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}