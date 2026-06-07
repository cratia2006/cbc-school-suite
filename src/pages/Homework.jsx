import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function Homework() {
  const [homework, setHomework] = useState([]);
  const [classesList, setClassesList] = useState([]); 
  const [isTeacher, setIsTeacher] = useState(false);
  const [currentSchoolId, setCurrentSchoolId] = useState(null);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(""); 
  
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    checkUserRoleAndFetch();
  }, []);

  // 1. Structural Tenant Layer: Fetch user profile, determine credentials, and scope lookups
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
          setIsTeacher(true);
        }

        setCurrentSchoolId(schoolId);
        
        // Parallel data execution bound to resolved tenant id context
        await Promise.all([
          fetchHomework(schoolId),
          fetchClasses(schoolId)
        ]);
      }
    } catch (err) {
      console.error("Credentials verification exception:", err);
    }
  }

  // 2. Fetch homework scoped to school tenant space
  async function fetchHomework(schoolId) {
    let query = supabase
      .from("homework")
      .select("*")
      .order("created_at", { ascending: false });

    const activeSchoolId = schoolId !== undefined ? schoolId : currentSchoolId;
    if (activeSchoolId) {
      query = query.eq("school_id", activeSchoolId);
    }

    const { data, error } = await query;
    if (!error) setHomework(data || []);
  }

  // 3. Fetch classes scoped to school tenant space
  async function fetchClasses(schoolId) {
    let query = supabase
      .from("classes")
      .select("*")
      .order("class_name", { ascending: true });

    const activeSchoolId = schoolId !== undefined ? schoolId : currentSchoolId;
    if (activeSchoolId) {
      query = query.eq("school_id", activeSchoolId);
    }

    const { data, error } = await query;
    if (!error) setClassesList(data || []);
  }

  // 4. Form submission handler with bucket path namespacing
  async function addHomework(e) {
    e.preventDefault();
    if (!isTeacher) return;

    if (!title || !subject || !grade || !description || !dueDate || !selectedClassId) {
      alert("Please fill all fields and select a target class stream.");
      return;
    }

    setUploading(true);
    let fileUrl = null;

    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      // Namespacing storage directory paths structural context per tenant root
      const filePath = currentSchoolId ? `${currentSchoolId}/${fileName}` : `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("homework-files")
        .upload(filePath, file);

      if (uploadError) {
        alert("Failed to upload attached file.");
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("homework-files")
        .getPublicUrl(filePath);

      fileUrl = publicUrl;
    }

    const { error } = await supabase
      .from("homework")
      .insert([
        { 
          school_id: currentSchoolId,
          title, 
          subject, 
          grade, 
          description, 
          due_date: dueDate, 
          file_url: fileUrl, 
          class_id: selectedClassId 
        }
      ]);

    setUploading(false);

    if (error) {
      alert("Failed to create homework");
    } else {
      setTitle(""); setSubject(""); setGrade(""); setDescription(""); setDueDate(""); setSelectedClassId(""); setFile(null);
      if (document.getElementById("file-input")) document.getElementById("file-input").value = "";
      fetchHomework(currentSchoolId);
    }
  }

  async function deleteHomework(id) {
    if (!isTeacher) return;
    const confirmed = window.confirm("Delete this homework?");
    if (!confirmed) return;

    const { error } = await supabase.from("homework").delete().eq("id", id);
    if (!error) fetchHomework(currentSchoolId);
  }

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>Homework Management</h2>

      {isTeacher ? (
        <form onSubmit={addHomework} style={{ textAlign: "left", maxWidth: "500px", margin: "0 auto", backgroundColor: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <div>
            <label style={{ fontWeight: "bold" }}>Target Class / Stream:</label>
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} style={{ width: "100%", padding: "8px", marginTop: "5px" }}>
              <option value="">-- Choose Class Mapping --</option>
              {classesList.map(cls => <option key={cls.id} value={cls.id}>{cls.class_name}</option>)}
            </select>
          </div>
          <br />
          <input type="text" placeholder="Homework Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: "8px", boxSizing: "border-box" }} />
          <br /><br />
          <input type="text" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: "100%", padding: "8px", boxSizing: "border-box" }} />
          <br /><br />
          <input type="text" placeholder="Grade Context (e.g. CBC Grade 3)" value={grade} onChange={(e) => setGrade(e.target.value)} style={{ width: "100%", padding: "8px", boxSizing: "border-box" }} />
          <br /><br />
          <textarea placeholder="Homework Description" rows="4" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", padding: "8px", boxSizing: "border-box" }} />
          <br /><br />
          <label>Due Date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: "100%", padding: "8px", boxSizing: "border-box", marginTop: "5px" }} />
          <br /><br />
          <label>Attach Material (PDF, Document, Image)</label>
          <input id="file-input" type="file" onChange={(e) => setFile(e.target.files[0])} style={{ marginTop: "5px" }} />
          <br /><br />
          <button type="submit" disabled={uploading} style={{ padding: "10px 20px", backgroundColor: "#6366f1", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", width: "100%", cursor: "pointer" }}>
            {uploading ? "Assigning & Uploading..." : "Assign Homework"}
          </button>
        </form>
      ) : (
        <div style={{ padding: "15px", background: "#edf2f7", borderRadius: "8px", color: "#4a5568", fontStyle: "italic", maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
          🔒 Connected via secure Parent Portal. Viewing active homework streams under view-only viewer flags.
        </div>
      )}

      <hr style={{ margin: "30px 0" }} />
      <h3>Assigned Homework Feed</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "15px", maxWidth: "600px", margin: "0 auto" }}>
        {homework.map((item) => (
          <div key={item.id} style={{ border: "1px solid #ccc", padding: "15px", borderRadius: "8px", textAlign: "left", backgroundColor: "#fff" }}>
            <h4>📝 {item.title}</h4>
            <p><strong>Subject:</strong> {item.subject} | <strong>Grade:</strong> {item.grade}</p>
            <p style={{ color: "#475569" }}>{item.description}</p>
            <p><strong>Due Date:</strong> <span style={{ color: "#b45309", fontWeight: "600" }}>{item.due_date}</span></p>
            {item.file_url && (
              <p><a href={item.file_url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", fontWeight: "600" }}>📥 View Attached Document Material</a></p>
            )}
            {isTeacher && <button onClick={() => deleteHomework(item.id)} style={{ backgroundColor: "#ff4d4d", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer" }}>Delete</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Homework;