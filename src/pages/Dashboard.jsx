import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [teacherName, setTeacherName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Advanced Administrative Metric Counters
  const [studentCount, setStudentCount] = useState(0);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [homeworkCount, setHomeworkCount] = useState(0);
  const [classCount, setClassCount] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState("100.0"); 
  
  // Real-time calculated subject performance data array state
  const [subjectRankings, setSubjectRankings] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    checkUserAndFetchStats();
  }, []);

  async function checkUserAndFetchStats() {
    setLoading(true);
    
    // 1. Get current logged-in user session safely
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    // 2. Multi-Table Robust Role & School Context Verification Step
    try {
      // Check central profiles metadata table first
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, school_id")
        .eq("id", user.id)
        .maybeSingle();

      // Secondary check: Fallback query directly against teachers infrastructure
      const { data: teacherProfile } = await supabase
        .from("teachers")
        .select("full_name, role, school_id")
        .eq("id", user.id)
        .maybeSingle();

      const verifiedRole = (profile?.role || teacherProfile?.role || "parent").toLowerCase();
      setUserRole(verifiedRole);

      // Extract the active tenant school ID
      const schoolId = profile?.school_id || teacherProfile?.school_id || null;

      if (teacherProfile?.full_name) {
        setTeacherName(teacherProfile.full_name);
      } else {
        setTeacherName(user.email);
      }

      // 3. Parallel Live Database Count Execution Requests (Scoped by Tenant)
      let studentsQuery = supabase.from("students").select("*", { count: 'exact', head: true });
      let assessmentsQuery = supabase.from("assessments").select("*", { count: 'exact', head: true });
      let homeworkQuery = supabase.from("homework").select("*", { count: 'exact', head: true });
      let classesQuery = supabase.from("classes").select("*", { count: 'exact', head: true });

      if (schoolId) {
        studentsQuery = studentsQuery.eq("school_id", schoolId);
        assessmentsQuery = assessmentsQuery.eq("school_id", schoolId);
        homeworkQuery = homeworkQuery.eq("school_id", schoolId);
        classesQuery = classesQuery.eq("school_id", schoolId);
      }

      const [
        { count: studentsTotal },
        { count: assessmentsTotal },
        { count: homeworkTotal },
        { count: classesTotal }
      ] = await Promise.all([studentsQuery, assessmentsQuery, homeworkQuery, classesQuery]);

      setStudentCount(studentsTotal || 0);
      setAssessmentCount(assessmentsTotal || 0);
      setHomeworkCount(homeworkTotal || 0);
      setClassCount(classesTotal || 0);

      // 4. Live Advanced Attendance Metric Calculation (Scoped by Tenant)
      let attendanceQuery = supabase.from("attendance").select("status");
      if (schoolId) {
        attendanceQuery = attendanceQuery.eq("school_id", schoolId);
      }
      
      const { data: attendanceRows } = await attendanceQuery;
      if (attendanceRows && attendanceRows.length > 0) {
        const totalMarked = attendanceRows.length;
        const totalPresent = attendanceRows.filter(r => r.status === "present").length;
        const calculatedRate = ((totalPresent / totalMarked) * 100).toFixed(1);
        setAttendanceRate(calculatedRate);
      } else {
        setAttendanceRate("100.0"); 
      }

      // 5. 🧠 REAL-TIME PERFORMANCE ANALYTICS COMPILER (Scoped by Tenant)
      let assessmentsAnalyticsQuery = supabase.from("assessments").select("subject, score");
      if (schoolId) {
        assessmentsAnalyticsQuery = assessmentsAnalyticsQuery.eq("school_id", schoolId);
      }

      const { data: rawAssessments, error: assError } = await assessmentsAnalyticsQuery;

      if (!assError && rawAssessments && rawAssessments.length > 0) {
        const subjectGroups = {};

        // Group total scores and raw count records per learning area
        rawAssessments.forEach(item => {
          const subName = item.subject || "Unknown";
          if (!subjectGroups[subName]) {
            subjectGroups[subName] = { totalScore: 0, recordCount: 0 };
          }
          subjectGroups[subName].totalScore += item.score;
          subjectGroups[subName].recordCount += 1;
        });

        // Loop through groupings to find true mathematical mean averages
        const processedRankings = Object.keys(subjectGroups).map(sub => {
          const meanAverage = Math.round(subjectGroups[sub].totalScore / subjectGroups[sub].recordCount);
          
          // Determine dynamic scale symbol thresholds
          let scaleSymbol = "BE";
          let barColor = "#dc2626"; // Red for BE
          
          if (meanAverage >= 80) {
            scaleSymbol = "EE";
            barColor = "#059669"; // Green for EE
          } else if (meanAverage >= 60) {
            scaleSymbol = "ME";
            barColor = "#2563eb"; // Blue for ME
          } else if (meanAverage >= 40) {
            scaleSymbol = "AE";
            barColor = "#d97706"; // Amber for AE
          }

          return {
            subjectName: sub,
            mean: meanAverage,
            scale: scaleSymbol,
            color: barColor
          };
        });

        // Sort descending from highest average to lowest average
        processedRankings.sort((a, b) => b.mean - a.mean);
        setSubjectRankings(processedRankings);
      } else {
        setSubjectRankings([]);
      }

    } catch (err) {
      console.error("Metrics counting error:", err.message);
    }

    setLoading(false);
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("Error logging out: " + error.message);
    } else {
      navigate("/login");
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "70vh", fontFamily: "sans-serif", fontSize: "16px", color: "#64748b" }}>
        ⚙️ Compiling Institutional Analytics Core...
      </div>
    );
  }

  return (
    <div style={{ padding: "4%", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", maxWidth: "1100px", margin: "0 auto", backgroundColor: "#f8fafc", minHeight: "85vh", boxSizing: "border-box" }}>
      
      {/* RESPONSIVE LAYOUT ENGINE AUTOMATION OVERRIDES */}
      <style>{`
        .dashboard-header-block {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #ffffff;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 35px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
          border: 1px solid #e2e8f0;
        }

        .analytics-lower-split {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 25px;
          text-align: left;
        }

        /* Fluid Layout Adapters for Mobile & Tablet screens */
        @media (max-width: 820px) {
          .dashboard-header-block {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
            padding: 20px !important;
          }
          .dashboard-header-block button {
            width: 100% !important;
            text-align: center !important;
          }
          .analytics-lower-split {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
        }
      `}</style>

      {/* 1. PROFESSIONAL HEADER PROFILE BANNER */}
      <div className="dashboard-header-block">
        <div style={{ textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px", flexWrap: "wrap" }}>
            <h2 style={{ margin: "0", color: "#0f172a", fontWeight: "700", fontSize: "21px" }}>Welcome Back, {teacherName}</h2>
            <span style={{ backgroundColor: (userRole === "teacher" || userRole === "admin") ? "#4f46e5" : "#10b981", color: "white", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {(userRole === "teacher" || userRole === "admin") ? "Administrator Portal" : "Parent / Viewer"}
            </span>
          </div>
          <p style={{ margin: 0, color: "#64748b", fontSize: "13.5px" }}>System Management Hub • CBC School Suite Core Console</p>
        </div>
        <button 
          onClick={handleLogout}
          style={{ padding: "10px 20px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13.5px", boxShadow: "0 2px 4px rgba(239, 68, 68, 0.15)", whiteSpace: "nowrap" }}
        >
          Log Out
        </button>
      </div>

      {/* 2. CORPORATE SUMMARY STATS TICKER GRID BLOCKS */}
      <h3 style={{ margin: "0 0 15px 0", color: "#1e293b", fontSize: "17px", fontWeight: "600", textAlign: "left" }}>Executive Performance Overview</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "35px" }}>
        
        <div style={{ padding: "24px", border: "1px solid #e2e8f0", borderRadius: "12px", backgroundColor: "#fff", textAlign: "left", boxShadow: "0 1px 3px rgba(0,0,0,0.01)" }}>
          <span style={{ fontSize: "20px" }}>👥</span>
          <h4 style={{ margin: "10px 0 6px 0", color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Students</h4>
          <p style={{ fontSize: "32px", fontWeight: "700", margin: "0", color: "#2563eb" }}>{studentCount}</p>
        </div>

        <div style={{ padding: "24px", border: "1px solid #e2e8f0", borderRadius: "12px", backgroundColor: "#fff", textAlign: "left", boxShadow: "0 1px 3px rgba(0,0,0,0.01)" }}>
          <span style={{ fontSize: "20px" }}>📊</span>
          <h4 style={{ margin: "10px 0 6px 0", color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Assessments</h4>
          <p style={{ fontSize: "32px", fontWeight: "700", margin: "0", color: "#059669" }}>{assessmentCount}</p>
        </div>

        <div style={{ padding: "24px", border: "1px solid #e2e8f0", borderRadius: "12px", backgroundColor: "#fff", textAlign: "left", boxShadow: "0 1px 3px rgba(0,0,0,0.01)" }}>
          <span style={{ fontSize: "20px" }}>📝</span>
          <h4 style={{ margin: "10px 0 6px 0", color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Homework Assigned</h4>
          <p style={{ fontSize: "32px", fontWeight: "700", margin: "0", color: "#7c3aed" }}>{homeworkCount}</p>
        </div>

        <div style={{ padding: "24px", border: "1px solid #e2e8f0", borderRadius: "12px", backgroundColor: "#fff", textAlign: "left", boxShadow: "0 1px 3px rgba(0,0,0,0.01)" }}>
          <span style={{ fontSize: "20px" }}>📅</span>
          <h4 style={{ margin: "10px 0 6px 0", color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Attendance Rate</h4>
          <p style={{ fontSize: "32px", fontWeight: "700", margin: "0", color: "#ea580c" }}>{attendanceRate}%</p>
        </div>

      </div>

      {/* 3. CORE ANALYTICS BUSINESS INSIGHT PANELS */}
      <div className="analytics-lower-split">
        
        {/* ================= PANEL A: DYNAMIC PERFORMANCE INSIGHT WIDGET ================= */}
        <div style={{ backgroundColor: "#ffffff", padding: "25px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.01)" }}>
          <h4 style={{ margin: "0 0 15px 0", color: "#0f172a", fontSize: "15px", fontWeight: "600", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            📈 Top Performing Subjects
          </h4>
          
          {subjectRankings.length === 0 ? (
            <div style={{ padding: "30px 0", fontStyle: "italic", color: "#94a3b8", textAlign: "center", fontSize: "14px" }}>
              No grades recorded yet. Subject metrics graphs will generate automatically here when marks are saved inside your Marksheet Panels.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "15px" }}>
              {subjectRankings.map((sub, idx) => (
                <div key={idx}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "5px", fontWeight: "500", flexWrap: "wrap", gap: "4px" }}>
                    <span style={{ color: "#334155", fontWeight: "600" }}>{sub.subjectName}</span>
                    <span style={{ color: sub.color, fontWeight: "700" }}>{sub.mean}% Mean ({sub.scale})</span>
                  </div>
                  {/* Dynamic Graphical Vector Bar Tracker */}
                  <div style={{ width: "100%", height: "8px", backgroundColor: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{ width: `${sub.mean}%`, height: "100%", backgroundColor: sub.color, borderRadius: "10px", transition: "width 0.4s ease" }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================= PANEL B: OPERATIONAL SUMMARY MATRIX ================= */}
        <div style={{ backgroundColor: "#ffffff", padding: "25px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.01)", height: "fit-content" }}>
          <h4 style={{ margin: "0 0 15px 0", color: "#0f172a", fontSize: "15px", fontWeight: "600", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            🏫 Operational Directory Summary
          </h4>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px", marginTop: "10px" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 0", color: "#64748b" }}>Active Managed Streams</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: "700", color: "#1e293b" }}>{classCount} Streams</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 0", color: "#64748b" }}>Data Synchronization</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: "700", color: "#059669" }}>✓ Real-time</td>
              </tr>
              <tr>
                <td style={{ padding: "10px 0", color: "#64748b" }}>System Status</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: "700", color: "#2563eb" }}>Production OK</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}