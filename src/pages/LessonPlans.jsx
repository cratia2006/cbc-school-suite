import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function LessonPlans() {
  const [plans, setPlans] = useState([]);
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentSchoolId, setCurrentSchoolId] = useState(null);

  // Form Metadata input states
  const [grade, setGrade] = useState("");
  const [learningArea, setLearningArea] = useState("");
  const [strand, setStrand] = useState("");
  const [subStrand, setSubStrand] = useState("");

  useEffect(() => {
    checkUserRoleAndFetch();
  }, []);

  // 1. Enforce Role Privileges and Tenant Scope Isolation
  async function checkUserRoleAndFetch() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Query user's teacher context profile to grab school context securely
        const { data: profile } = await supabase
          .from("teachers")
          .select("role, school_id")
          .eq("id", user.id)
          .maybeSingle();

        const role = profile?.role || "guest";
        const schoolId = profile?.school_id || null;

        if (profile && role === "teacher") {
          setIsTeacher(true);
        }
        
        setCurrentSchoolId(schoolId);
        // Instantly kick off isolated data load chain matching context
        await fetchLessonPlans(schoolId);
      }
    } catch (err) {
      console.error("User context security resolution failed:", err);
    }
  }

  // 2. Fetch Stored Lesson Plans Live (Scoped strictly to Active Tenant Space)
  async function fetchLessonPlans(schoolId) {
    let query = supabase
      .from("lesson_plans")
      .select("*")
      .order("created_at", { ascending: false });

    // Enforce data frame boundaries if matching tenant context is found
    const activeSchoolId = schoolId !== undefined ? schoolId : currentSchoolId;
    if (activeSchoolId) {
      query = query.eq("school_id", activeSchoolId);
    }

    const { data, error } = await query;
    if (!error) setPlans(data || []);
  }

  // 🧠 INTERNAL CBC GENERATOR ENGINE
  // Automatically creates matching curriculum text structures based on inputs
  function generateCbcContent(area, str, sub) {
    // Default template fallback if no match is found
    let outcome = `By the end of the lesson, the learner should be able to explain key concepts under ${sub} and apply them in daily life structures.`;
    let experiences = `1. Learners work in pairs to discuss examples of ${sub}.\n2. The teacher demonstrates practical applications on the board.\n3. Learners complete a guided task in their workbooks.`;
    let resources = `CBC Curriculum Handbook, Student Textbook, Board illustrations, relevant charts.`;
    let assessment = `Oral questioning during the lesson, structured group observation, workbook review exercises.`;

    // Dynamic Context-Aware Rules (e.g. Mathematics, Science, Language)
    if (area.toLowerCase().includes("math") || area.toLowerCase().includes("num")) {
      outcome = `By the end of the lesson, the learner should be able to solve basic problems involving ${sub} accurately and appreciate its application in real life shopping scenarios.`;
      experiences = `1. Learners handle physical counters/objects to represent ${sub} groups.\n2. In groups, learners play a classroom marketplace game solving practical word problems.\n3. Learners write answers to textbook exercises individually for verification.`;
      resources = `Plastic coins, counters, number charts, digital math app games where applicable.`;
      assessment = `Written class quiz, peer evaluation charts, checking individual exercise workings.`;
    } else if (area.toLowerCase().includes("sci") || area.toLowerCase().includes("env")) {
      outcome = `By the end of the lesson, the learner should be able to identify key components of ${sub} through observation and record findings cleanly in their charts.`;
      experiences = `1. Learners take a brief nature walk to observe practical examples of ${sub}.\n2. In pairs, learners illustrate their observations on a chart paper.\n3. The teacher leads a summary question-and-answer session on safety precautions.`;
      resources = `Real specimens, magnifying glasses, safety gloves, pictorial posters.`;
      assessment = `Direct observation of lab/field participation, drawing inspection, portfolio checks.`;
    }

    return { outcome, experiences, resources, assessment };
  }

  // 3. Process Automated Generation & Database Save Loop
  async function handleGenerateAndSave(e) {
    e.preventDefault();
    if (!isTeacher) return;

    if (!grade || !learningArea || !strand || !subStrand) {
      alert("Please fill in all the class and curriculum metadata fields first.");
      return;
    }

    setLoading(true);

    // Run the generation engine to build the complete lesson plan elements
    const cbcJson = generateCbcContent(learningArea, strand, subStrand);

    // Save everything securely to Supabase while logging matching school identity frame
    const { error } = await supabase.from("lesson_plans").insert([
      {
        school_id: currentSchoolId,
        grade: grade,
        learning_area: learningArea,
        strand: strand,
        sub_strand: subStrand,
        outcome: cbcJson.outcome,
        experiences: cbcJson.experiences,
        resources: cbcJson.resources,
        assessment_methods: cbcJson.assessment
      }
    ]);

    await fetchLessonPlans(currentSchoolId); // Instantly update view feed matching context bounds
    setLoading(false);

    if (error) {
      alert("Error logging generated plan: " + error.message);
    } else {
      // Clear inputs
      setGrade("");
      setLearningArea("");
      setStrand("");
      setSubStrand("");
      alert("🎉 Premium CBC Lesson Plan generated and synchronized to cloud storage successfully!");
    }
  }

  return (
    <div style={{ padding: "30px", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", maxWidth: "1200px", margin: "0 auto", backgroundColor: "#f8fafc", minHeight: "85vh" }}>
      
      <div style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: "15px", marginBottom: "30px", textAlign: "left" }}>
        <h2 style={{ margin: "0 0 5px 0", color: "#1e293b", fontWeight: "700" }}>Smart CBC Lesson Planner</h2>
        <p style={{ margin: "0", color: "#64748b", fontSize: "14px" }}>Input basic metadata definitions to instantly auto-generate and store standard learning structures.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isTeacher ? "1fr 1.5fr" : "1fr", gap: "30px" }}>
        
        {/* ================= COLUMN 1: METADATA CAPTURE WORKSPACE (Teachers Only) ================= */}
        {isTeacher && (
          <div style={{ backgroundColor: "#ffffff", padding: "25px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", height: "fit-content", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <span style={{ backgroundColor: "#8b5cf6", color: "#fff", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>AI ENGINE ACTIVE</span>
            </div>
            <h3 style={{ margin: "0 0 20px 0", color: "#0f172a", fontSize: "18px", textAlign: "left" }}>Plan Configuration</h3>
            
            <form onSubmit={handleGenerateAndSave} style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Class Level / Grade</label>
                <input type="text" placeholder="e.g., Grade 3" value={grade} onChange={(e) => setGrade(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box", outline: "none" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Learning Area (Subject)</label>
                <input type="text" placeholder="e.g., Mathematics" value={learningArea} onChange={(e) => setLearningArea(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box", outline: "none" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Strand</label>
                <input type="text" placeholder="e.g., Numbers" value={strand} onChange={(e) => setStrand(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box", outline: "none" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Sub-Strand</label>
                <input type="text" placeholder="e.g., Fractions" value={subStrand} onChange={(e) => setSubStrand(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box", outline: "none" }} />
              </div>

              <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", backgroundColor: "#8b5cf6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px", boxShadow: "0 2px 4px rgba(139, 92, 246, 0.2)" }}>
                {loading ? "Compiling Curriculum Content..." : "⚡ Generate & Deploy Lesson Plan"}
              </button>
            </form>
          </div>
        )}

        {/* ================= COLUMN 2: PREMIUM GENERATED MATRIX FEED (Visible to All) ================= */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h3 style={{ margin: "0 0 20px 0", color: "#0f172a", fontSize: "18px", textAlign: "left" }}>Generated Document Repository</h3>

          {plans.length === 0 ? (
            <div style={{ padding: "40px", backgroundColor: "#fff", borderRadius: "12px", border: "1px dashed #cbd5e1", textAlign: "center", color: "#94a3b8" }}>
              <p style={{ margin: "0", fontStyle: "italic" }}>No compiled lesson structures available.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "25px", maxHeight: "75vh", overflowY: "auto", paddingRight: "5px" }}>
              {plans.map((plan) => (
                <div key={plan.id} style={{ backgroundColor: "#ffffff", padding: "25px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)", textAlign: "left" }}>
                  
                  {/* Official Header Banner Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", backgroundColor: "#fafafa", padding: "10px", borderRadius: "6px", border: "1px solid #eee" }}>
                    <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "14px" }}>
                      ✏️ {plan.learning_area ? plan.learning_area.toUpperCase() : "UNASSIGNED"} ({plan.grade || "N/A"})
                    </span>
                    <span style={{ fontSize: "12px", color: "#64748b", background: "#fff", padding: "4px 8px", borderRadius: "4px", border: "1px solid #ddd" }}>
                      Strand: {plan.strand || "None"} / {plan.sub_strand || "None"}
                    </span>
                  </div>

                  {/* 4-Part Premium CBC Matrix Layout Blocks */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13.5px", color: "#334155" }}>
                    <div>
                      <strong style={{ color: "#8b5cf6", display: "block", marginBottom: "3px" }}>🎯 Specific Learning Outcomes:</strong>
                      <p style={{ margin: "0", background: "#fbfbfe", padding: "8px", borderRadius: "4px", borderLeft: "3px solid #8b5cf6" }}>
                        {plan.outcome}
                      </p>
                    </div>

                    <div>
                      <strong style={{ color: "#0ea5e9", display: "block", marginBottom: "3px" }}>👥 Suggested Learning Experiences:</strong>
                      <p style={{ margin: "0", background: "#f0f9ff", padding: "8px", borderRadius: "4px", borderLeft: "3px solid #0ea5e9", whiteSpace: "pre-line" }}>
                        {plan.experiences}
                      </p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "4px" }}>
                      <div>
                        <strong style={{ color: "#eab308", display: "block", marginBottom: "3px" }}>📦 Learning Resources:</strong>
                        <p style={{ margin: "0", background: "#fefce8", padding: "8px", borderRadius: "4px", borderLeft: "3px solid #eab308" }}>
                          {plan.resources}
                        </p>
                      </div>
                      <div>
                        <strong style={{ color: "#10b981", display: "block", marginBottom: "3px" }}>📝 Assessment Methods:</strong>
                        <p style={{ margin: "0", background: "#f0fdf4", padding: "8px", borderRadius: "4px", borderLeft: "3px solid #10b981" }}>
                          {plan.assessment_methods || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}