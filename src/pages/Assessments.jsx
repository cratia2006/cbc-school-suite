import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function Assessments() {
  const [classesList, setClassesList] = useState([]);
  const [students, setStudents] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentSchoolId, setCurrentSchoolId] = useState(null);

  // Strict Academic Filter & Form States
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(""); // Managed via free-text input
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedTerm, setSelectedTerm] = useState("Term 1");
  const [selectedExamType, setSelectedExamType] = useState("Mid-Term");
  
  // Dynamic grades input state mapped by student ID: { [studentId]: score }
  const [scores, setScores] = useState({});

  const termsList = ["Term 1", "Term 2", "Term 3"];
  const examTypesList = ["Mid-Term", "End-Term"];

  // Generates a dynamic sliding window of years (e.g., 5 years back to 10 years ahead)
  const currentYear = new Date().getFullYear();
  const yearsList = Array.from({ length: 16 }, (_, i) => (currentYear - 5 + i).toString());

  useEffect(() => {
    checkUserRoleAndFetchInitial();
  }, []);

  // Reload grades sheet when context changes
  useEffect(() => {
    if (selectedClassId && selectedSubject.trim() && selectedYear && selectedTerm && selectedExamType) {
      fetchSavedAssessments();
    } else {
      setAssessments([]);
      setScores({});
    }
  }, [selectedClassId, selectedSubject, selectedYear, selectedTerm, selectedExamType]);

  async function checkUserRoleAndFetchInitial() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("role, school_id").eq("id", user.id).maybeSingle();
      const { data: teacher } = await supabase.from("teachers").select("role, school_id").eq("id", user.id).maybeSingle();
      
      const role = (profile?.role || teacher?.role || "guest").toLowerCase();
      const schoolId = profile?.school_id || teacher?.school_id || null;
      
      setIsAuthorized(role === "teacher" || role === "admin");
      setCurrentSchoolId(schoolId);

      // Fetch classes and students scoped by the active tenant ID
      let classesQuery = supabase.from("classes").select("*").order("class_name", { ascending: true });
      let studentsQuery = supabase.from("students").select("*");

      if (schoolId) {
        classesQuery = classesQuery.eq("school_id", schoolId);
        studentsQuery = studentsQuery.eq("school_id", schoolId);
      }

      const { data: cls } = await classesQuery;
      const { data: std } = await studentsQuery;

      setClassesList(cls || []);
      setStudents(std || []);
    } catch (err) {
      console.error("Authorization or context fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSavedAssessments() {
    let query = supabase
      .from("assessments")
      .select("*")
      .eq("class_id", selectedClassId)
      .eq("subject", selectedSubject.trim())
      .eq("year", selectedYear)
      .eq("term", selectedTerm)
      .eq("exam_type", selectedExamType);

    // Filter assessments by tenant school scope if available
    if (currentSchoolId) {
      query = query.eq("school_id", currentSchoolId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setAssessments(data);
      const scoreMap = {};
      data.forEach(record => {
        scoreMap[record.student_id] = record.score;
      });
      setScores(scoreMap);
    } else {
      setAssessments([]);
      setScores({});
    }
  }

  const handleScoreChange = (studentId, val) => {
    const numericVal = val === "" ? "" : Math.min(100, Math.max(0, parseInt(val) || 0));
    setScores(prev => ({ ...prev, [studentId]: numericVal }));
  };

  async function handleSaveMarksheet(e) {
    e.preventDefault();
    if (!isAuthorized) {
      alert("Access Denied: You do not have permissions to record exam marks.");
      return;
    }
    if (!selectedSubject.trim()) {
      alert("Please specify a Subject / Learning Area title.");
      return;
    }

    setSubmitting(true);
    const filteredStudents = students.filter(s => s.class_id === selectedClassId);
    
    const upsertPromises = filteredStudents.map(async (student) => {
      const scoreValue = scores[student.id];
      if (scoreValue === undefined || scoreValue === "") return;

      const existingRecord = assessments.find(a => a.student_id === student.id);

      if (existingRecord) {
        return supabase
          .from("assessments")
          .update({ score: scoreValue })
          .eq("id", existingRecord.id);
      } else {
        return supabase
          .from("assessments")
          .insert([{
            student_id: student.id,
            class_id: selectedClassId,
            subject: selectedSubject.trim(),
            year: selectedYear,
            term: selectedTerm,
            exam_type: selectedExamType,
            score: scoreValue,
            school_id: currentSchoolId // Injects tenant scope id into the record metadata
          }]);
      }
    });

    await Promise.all(upsertPromises);
    alert("Marksheet entries synchronized successfully.");
    fetchSavedAssessments();
    setSubmitting(false);
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>Loading Examination Portal Context...</div>;
  }

  const activeStudents = students.filter(s => s.class_id === selectedClassId);

  return (
    <div style={{ padding: "4%", fontFamily: "'Segoe UI', sans-serif", maxWidth: "1200px", margin: "0 auto", backgroundColor: "#f8fafc", minHeight: "85vh", boxSizing: "border-box" }}>
      
      {/* INJECTED CSS STYLESHEET FOR FLUID FLEXIBLE RESPONSIVENESS */}
      <style>{`
        .assessment-header-bar {
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 15px;
          margin-bottom: 30px;
          text-align: left;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .assessment-two-column {
          display: grid;
          grid-template-columns: 1fr 3fr;
          gap: 30px;
        }

        .meta-registry-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          background: #f8fafc;
          padding: 12px 20px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .student-score-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: #fafafa;
          border: 1px solid #eee;
          border-radius: 8px;
        }

        /* Responsive Breakpoint Matrix */
        @media (max-width: 868px) {
          .assessment-header-bar {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .assessment-two-column {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .meta-registry-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
            padding: 12px 15px !important;
          }
          .student-score-card {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 14px !important;
            padding: 15px !important;
          }
          .student-score-card > div {
            width: 100% !important;
          }
          .student-score-card .input-score-wrapper {
            display: flex !important;
            justify-content: flex-start !important;
            align-items: center !important;
          }
          .student-score-card input {
            width: 100% !important;
            max-width: 120px !important;
            padding: 10px !important;
            font-size: 16px !important;
          }
        }
      `}</style>

      {/* HEADER ROW */}
      <div className="assessment-header-bar">
        <div>
          <h2 style={{ margin: "0 0 5px 0", color: "#1e293b", fontWeight: "700", fontSize: "calc(18px + 0.5vw)" }}>Examination Performance Panel</h2>
          <p style={{ margin: "0", color: "#64748b", fontSize: "14px" }}>Record standard termly exam scores across verified school class streams.</p>
        </div>
        <span style={{ backgroundColor: isAuthorized ? "#1e293b" : "#e2e8f0", color: isAuthorized ? "white" : "#475569", padding: "6px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold", whiteSpace: "nowrap" }}>
          {isAuthorized ? "🔒 Marksheet Write-Access Enabled" : "👁️ View-Only Mode"}
        </span>
      </div>

      <div className="assessment-two-column">
        
        {/* ================= FILTER PANEL ================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: "15px", backgroundColor: "#fff", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "left", height: "fit-content", boxSizing: "border-box" }}>
          <h4 style={{ margin: "0 0 5px 0", color: "#0f172a", fontWeight: "700" }}>Exam Configuration</h4>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Academic Year</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#fff", outline: "none" }}>
              {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Target Term</label>
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#fff", outline: "none" }}>
              {termsList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Examination Type</label>
            <select value={selectedExamType} onChange={(e) => setSelectedExamType(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#fff", outline: "none" }}>
              {examTypesList.map(et => <option key={et} value={et}>{et}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Class Level</label>
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#fff", outline: "none" }}>
              <option value="">-- Select Class --</option>
              {classesList.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Subject / Learning Area</label>
            <input 
              type="text"
              placeholder="e.g., Mathematics, Kiswahili"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "13.5px", outline: "none" }}
            />
          </div>
        </div>

        {/* ================= MARKSHEET ENTRY PANEL ================= */}
        <div style={{ backgroundColor: "#fff", padding: "calc(12px + 1vw)", borderRadius: "12px", border: "1px solid #e2e8f0", textAlign: "left", boxSizing: "border-box" }}>
          {!selectedClassId || !selectedSubject.trim() ? (
            <div style={{ padding: "80px 0", textAlign: "center", color: "#94a3b8", fontStyle: "italic", fontSize: "14px" }}>
              Choose a specific class stream and type out a subject area from the configuration workspace to load exam rosters.
            </div>
          ) : (
            <form onSubmit={handleSaveMarksheet}>
              <div className="meta-registry-row">
                <div style={{ wordBreak: "break-word" }}>
                  <span style={{ fontSize: "13.5px", color: "#475569" }}>Active Registry Set:</span>
                  <strong style={{ marginLeft: "6px", color: "#0f172a", display: "inline-block" }}>
                    {selectedSubject} — {selectedYear} {selectedTerm} ({selectedExamType})
                  </strong>
                </div>
                <span style={{ fontSize: "13px", color: "#4f46e5", fontWeight: "600", whiteSpace: "nowrap" }}>
                  {activeStudents.length} Students Indexed
                </span>
              </div>

              {activeStudents.length === 0 ? (
                <p style={{ color: "#94a3b8", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
                  No students are currently enrolled in this class group.
                </p>
              ) : (
                <div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "25px" }}>
                    {activeStudents.map(student => (
                      <div key={student.id} className="student-score-card">
                        <div>
                          <p style={{ margin: "0", fontWeight: "600", fontSize: "14.5px", color: "#1e293b" }}>{student.full_name}</p>
                          <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>Adm: {student.admission_no || "N/A"}</p>
                        </div>
                        <div className="input-score-wrapper" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Score"
                            disabled={!isAuthorized}
                            value={scores[student.id] !== undefined ? scores[student.id] : ""}
                            onChange={(e) => handleScoreChange(student.id, e.target.value)}
                            style={{ width: "80px", padding: "8px", textAlign: "center", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600", outline: "none" }}
                          />
                          <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "bold" }}>%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {isAuthorized && (
                    <button 
                      type="submit" 
                      disabled={submitting} 
                      style={{ width: "100%", padding: "14px", backgroundColor: "#1e293b", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "14px", cursor: "pointer", transition: "background-color 0.2s" }}
                    >
                      {submitting ? "Saving Marksheet Context..." : "Commit Term Marks to Server"}
                    </button>
                  )}
                </div>
              )}
            </form>
          )}
        </div>

      </div>
    </div>
  );
}