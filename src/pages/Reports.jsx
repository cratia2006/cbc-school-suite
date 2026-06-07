import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";

export default function Reports() {
  const [classesList, setClassesList] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentSchoolId, setCurrentSchoolId] = useState(null);

  // Configuration Filters
  const [schoolName, setSchoolName] = useState("SPRINGFIELD ACADEMY");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedTerm, setSelectedTerm] = useState("Term 1");
  const [selectedExamType, setSelectedExamType] = useState("Mid-Term");
  const [selectedStudentId, setSelectedStudentId] = useState("all"); // Focus filter for single student tracking
  const [reportViewMode, setReportViewMode] = useState("merit"); // 'merit' for summary sheet matrix, 'cards' for deep dive page sheets
  
  // Compiled Data Matrices
  const [compiledData, setCompiledData] = useState([]);
  const [allSubjectsInClass, setAllSubjectsInClass] = useState([]);
  const [compiling, setCompiling] = useState(false);

  const navigate = useNavigate();
  const termsList = ["Term 1", "Term 2", "Term 3"];
  const examTypesList = ["Mid-Term", "End-Term"];
  
  const currentYear = new Date().getFullYear();
  const yearsList = Array.from({ length: 16 }, (_, i) => (currentYear - 5 + i).toString());

  useEffect(() => {
    checkUserRoleAndFetch();
  }, []);

  async function checkUserRoleAndFetch() {
    setLoading(true);
    try {
      // 1. Enforce strict Admin/Teacher Router Security Context Layer
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role, school_id").eq("id", user.id).maybeSingle();
      const { data: teacher } = await supabase.from("teachers").select("role, school_id").eq("id", user.id).maybeSingle();
      
      const role = (profile?.role || teacher?.role || "guest").toLowerCase();
      const schoolId = profile?.school_id || teacher?.school_id || null;

      if (role !== "teacher" && role !== "admin") {
        alert("Security Lockout: Unauthorized view access restricted.");
        navigate("/dashboard");
        return;
      }
      setIsAuthorized(true);
      setCurrentSchoolId(schoolId);

      // Attempt to resolve custom institutional branding if available in user context
      if (schoolId) {
        const { data: institution } = await supabase.from("schools").select("school_name").eq("id", schoolId).maybeSingle();
        if (institution?.school_name) {
          setSchoolName(institution.school_name.toUpperCase());
        }
      }

      // 2. Hydrate Roster Arrays scoped strictly to tenant id
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
      console.error("Initialization failure Vector:", err);
    } finally {
      setLoading(false);
    }
  }

  async function compileDataWorkspace() {
    if (!selectedClassId) {
      alert("Please choose a target class stream.");
      return;
    }
    setCompiling(true);

    try {
      // Fetch matching data indices from structural schema
      let marksQuery = supabase
        .from("assessments")
        .select("*")
        .eq("class_id", selectedClassId)
        .eq("year", selectedYear)
        .eq("term", selectedTerm)
        .eq("exam_type", selectedExamType);

      // Isolate records by tenant space scope
      if (currentSchoolId) {
        marksQuery = marksQuery.eq("school_id", currentSchoolId);
      }

      const { data: marks, error } = await marksQuery;
      if (error) throw error;

      const classRoster = students.filter(s => s.class_id === selectedClassId);

      // Extract unique subjects across the dataset to build dynamic tabular headers
      const subjectsFound = [...new Set(marks.map(m => m.subject))].sort();
      setAllSubjectsInClass(subjectsFound);

      // Build performance matrices per student row
      let rawStudentRecords = classRoster.map(student => {
        const studentMarks = marks.filter(m => m.student_id === student.id) || [];
        
        let totalSum = 0;
        let subjectsMap = {};
        let rawSubjectsArray = [];

        // Build individual scores matrix map
        subjectsFound.forEach(sub => {
          const match = studentMarks.find(m => m.subject === sub);
          const scoreVal = match ? match.score : null;
          subjectsMap[sub] = scoreVal;
          if (scoreVal !== null) {
            totalSum += scoreVal;
            
            let scale = "BE";
            if (scoreVal >= 80) scale = "EE";
            else if (scoreVal >= 60) scale = "ME";
            else if (scoreVal >= 40) scale = "AE";

            rawSubjectsArray.push({ subjectName: sub, score: scoreVal, scale });
          }
        });

        const countedSubjects = studentMarks.length;
        const meanAverage = countedSubjects > 0 ? Math.round(totalSum / countedSubjects) : 0;

        return {
          id: student.id,
          studentName: student.full_name,
          admissionNo: student.admission_no || "N/A",
          scoresGrid: subjectsMap,
          subjectsArray: rawSubjectsArray,
          total: totalSum,
          average: meanAverage
        };
      });

      // Calculate relative competitive positioning (Ranks) based on total scores
      rawStudentRecords.sort((a, b) => b.total - a.total);
      
      let currentRank = 1;
      let recordsWithRankings = rawStudentRecords.map((rec, index) => {
        if (index > 0 && rec.total < rawStudentRecords[index - 1].total) {
          currentRank = index + 1;
        }
        return { ...rec, position: currentRank };
      });

      // Handle individual focal single student dropdown routing filter overrides
      if (selectedStudentId !== "all") {
        recordsWithRankings = recordsWithRankings.filter(r => r.id === selectedStudentId);
      }

      setCompiledData(recordsWithRankings);
    } catch (err) {
      console.error(err);
      alert("Error parsing record compilations: " + err.message);
    } finally {
      setCompiling(false);
    }
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>Verifying Authorization & Systems Framework...</div>;
  }

  const activeClassStudents = students.filter(s => s.class_id === selectedClassId);

  return (
    <div style={{ padding: "30px", fontFamily: "'Segoe UI', sans-serif", maxWidth: "1250px", margin: "0 auto" }}>
      
      {/* FILTER CONTROL CONFIGURATION SPACE */}
      <div className="no-print" style={{ backgroundColor: "#ffffff", padding: "25px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "35px", textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: "0", color: "#0f172a", fontWeight: "700" }}>Institutional Report & Merit Engine</h3>
          <div style={{ display: "flex", gap: "5px", background: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
            <button onClick={() => setReportViewMode("merit")} style={{ padding: "6px 12px", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", background: reportViewMode === "merit" ? "#ffffff" : "transparent", boxShadow: reportViewMode === "merit" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", color: reportViewMode === "merit" ? "#0f172a" : "#64748b" }}>📋 Merit Summary List</button>
            <button onClick={() => setReportViewMode("cards")} style={{ padding: "6px 12px", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", background: reportViewMode === "cards" ? "#ffffff" : "transparent", boxShadow: reportViewMode === "cards" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", color: reportViewMode === "cards" ? "#0f172a" : "#64748b" }}>🎓 Individual Report Cards</button>
          </div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "15px", alignItems: "end" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "6px" }}>Institution Branding Name</label>
            <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value.toUpperCase())} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box", fontWeight: "600" }} />
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "6px" }}>Academic Year</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
              {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "6px" }}>Term Node</label>
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
              {termsList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "6px" }}>Exam Milestone</label>
            <select value={selectedExamType} onChange={(e) => setSelectedExamType(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
              {examTypesList.map(et => <option key={et} value={et}>{et}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "6px" }}>Stream Group</label>
            <select value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setSelectedStudentId("all"); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
              <option value="">-- Select Class --</option>
              {classesList.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "6px" }}>Target Focus</label>
            <select value={selectedStudentId} disabled={!selectedClassId} onChange={(e) => setSelectedStudentId(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
              <option value="all">Complete Roster Matrix (All)</option>
              {activeClassStudents.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>

          <button onClick={compileDataWorkspace} disabled={compiling} style={{ padding: "10px", backgroundColor: "#1e293b", color: "white", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>
            {compiling ? "Compiling..." : "Build Matrix"}
          </button>
        </div>

        {compiledData.length > 0 && (
          <button onClick={() => window.print()} style={{ marginTop: "20px", width: "100%", padding: "12px", backgroundColor: "#059669", color: "white", border: "none", borderRadius: "6px", fontWeight: "700", cursor: "pointer", fontSize: "14px" }}>
            🖨️ Export Layout Frame View to Print / PDF
          </button>
        )}
      </div>

      {/* ================= PRINT DESPATCH DISPLAY MATRIX SECTOR ================= */}
      <div id="print-sheet-area" style={{ textAlign: "left" }}>
        {compiledData.length === 0 ? (
          <div className="no-print" style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8", border: "2px dashed #e2e8f0", borderRadius: "12px", backgroundColor: "#fff", fontStyle: "italic" }}>
            Configure institutional fields above and deploy build execution matrix.
          </div>
        ) : (
          reportViewMode === "merit" ? (
            /* ================= VIEW OPTION A: BROAD MASTER MERIT SHEET SHEET ================= */
            <div style={{ backgroundColor: "#ffffff", padding: "35px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
              <div style={{ textAlign: "center", borderBottom: "3px double #000", paddingBottom: "12px", marginBottom: "20px" }}>
                <h1 style={{ margin: "0", fontSize: "24px", fontWeight: "800" }}>{schoolName}</h1>
                <h2 style={{ margin: "5px 0 0 0", fontSize: "15px", fontWeight: "700", textTransform: "uppercase", color: "#334155" }}>Master Academic Merit Tabulation Sheet</h2>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", fontWeight: "500", color: "#64748b" }}>
                  {selectedYear} — {selectedTerm} | Exam Focus Frame: <strong>{selectedExamType}</strong>
                </p>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#0f172a", color: "#ffffff" }}>
                    <th style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "center" }}>Pos</th>
                    <th style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "left" }}>Admission</th>
                    <th style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "left", minWidth: "160px" }}>Student Full Name</th>
                    {allSubjectsInClass.map((sub, idx) => (
                      <th key={idx} style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "center", fontSize: "11px" }}>{sub}</th>
                    ))}
                    <th style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "bold", backgroundColor: "#1e293b" }}>Total</th>
                    <th style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "bold", backgroundColor: "#1e293b" }}>Mean (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {compiledData.map((row, rIdx) => (
                    <tr key={rIdx} style={{ backgroundColor: rIdx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                      <td style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "700", color: row.position === 1 ? "#059669" : "#000" }}>{row.position}</td>
                      <td style={{ padding: "10px", border: "1px solid #cbd5e1", color: "#475569" }}>{row.admissionNo}</td>
                      <td style={{ padding: "10px", border: "1px solid #cbd5e1", fontWeight: "600", color: "#0f172a" }}>{row.studentName}</td>
                      {allSubjectsInClass.map((sub, sIdx) => (
                        <td key={sIdx} style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "500" }}>
                          {row.scoresGrid[sub] !== null ? `${row.scoresGrid[sub]}%` : "-"}
                        </td>
                      ))}
                      <td style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "700", backgroundColor: "#f1f5f9" }}>{row.total}</td>
                      <td style={{ padding: "10px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "700", color: "#2563eb", backgroundColor: "#f1f5f9" }}>{row.average}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* ================= VIEW OPTION B: SEPARATE INDIVIDUAL SINGLE CARD SHEETS ================= */
            compiledData.map((card, index) => (
              <div key={index} className="report-card-page" style={{ backgroundColor: "#ffffff", padding: "40px", borderRadius: "8px", border: "1px solid #cbd5e1", marginBottom: "40px", pageBreakAfter: "always" }}>
                
                <div style={{ textAlign: "center", borderBottom: "3px double #000", paddingBottom: "15px", marginBottom: "25px" }}>
                  <h1 style={{ margin: "0 0 5px 0", fontSize: "26px", fontWeight: "800" }}>{schoolName}</h1>
                  <p style={{ margin: "0", fontSize: "14px", fontWeight: "600", color: "#475569", textTransform: "uppercase" }}>Official Student Report Transcript</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>
                    {selectedYear} • {selectedTerm} • Assessment Node: {selectedExamType}
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "25px", fontSize: "14px", background: "#f8fafc", padding: "15px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  <div>Name: <strong style={{ color: "#0f172a" }}>{card.studentName}</strong></div>
                  <div>Admission No: <strong style={{ color: "#0f172a" }}>{card.admissionNo}</strong></div>
                  <div>Class Group: <strong>{classesList.find(c => c.id === selectedClassId)?.class_name || "Stream"}</strong></div>
                  <div>Stream Class Position Rank: <strong style={{ color: "#4f46e5", fontSize: "15px" }}>{card.position} out of {compiledData.length}</strong></div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#1e293b", color: "#ffffff" }}>
                      <th style={{ padding: "12px", border: "1px solid #cbd5e1", textAlign: "left" }}>Subject Domain</th>
                      <th style={{ padding: "12px", border: "1px solid #cbd5e1", textAlign: "center", width: "120px" }}>Score (%)</th>
                      <th style={{ padding: "12px", border: "1px solid #cbd5e1", textAlign: "center", width: "200px" }}>Descriptor Scale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {card.subjectsArray.map((sub, sIdx) => (
                      <tr key={sIdx} style={{ backgroundColor: sIdx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                        <td style={{ padding: "12px", border: "1px solid #cbd5e1", fontWeight: "600" }}>{sub.subjectName}</td>
                        <td style={{ padding: "12px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "700" }}>{sub.score}%</td>
                        <td style={{ padding: "12px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "700" }}>
                          <span style={{ color: sub.scale === "EE" ? "#059669" : sub.scale === "ME" ? "#2563eb" : sub.scale === "AE" ? "#d97706" : "#dc2626" }}>
                            {sub.scale === "EE" && "Exceeding Expectation (EE)"}
                            {sub.scale === "ME" && "Meeting Expectation (ME)"}
                            {sub.scale === "AE" && "Approaching Expectation (AE)"}
                            {sub.scale === "BE" && "Below Expectation (BE)"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: "#f1f5f9", fontWeight: "bold" }}>
                      <td style={{ padding: "12px", border: "1px solid #cbd5e1" }}>Aggregate Term Total Mark</td>
                      <td style={{ padding: "12px", border: "1px solid #cbd5e1", textAlign: "center", fontSize: "15px" }}>{card.total}</td>
                      <td style={{ padding: "12px", border: "1px solid #cbd5e1", textAlign: "center", color: "#2563eb", fontSize: "14px" }}>Mean: {card.average}%</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ marginTop: "45px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
                  <div style={{ borderTop: "1px dashed #64748b", textAlign: "center", paddingTop: "8px", fontSize: "13px" }}>Class Teacher's Verdict Signature</div>
                  <div style={{ borderTop: "1px dashed #64748b", textAlign: "center", paddingTop: "8px", fontSize: "13px" }}>Principal Seal Sign-off</div>
                </div>

              </div>
            ))
          )
        )}
      </div>

      <style>{`
        @media print {
          body { background: #fff !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .report-card-page { border: none !important; box-shadow: none !important; padding: 0 !important; margin-bottom: 0 !important; page-break-after: always !important; }
        }
      `}</style>
    </div>
  );
}