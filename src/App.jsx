import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Assessments from "./pages/Assessments";
import Reports from "./pages/Reports";
import LessonPlans from "./pages/LessonPlans";
import Communication from "./pages/Communication";
import Login from "./pages/login"; 
import Signup from "./pages/signup";
import ParentsContact from "./pages/ParentsContact";
import Homework from "./pages/Homework";
import ClassManagement from "./pages/ClassManagement";
import AdminSettings from "./pages/AdminSettings";
// Safely import the new School Registration component
import RegisterSchool from "./pages/RegisterSchool";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <hr />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/assessments" element={<Assessments />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/lesson-plans" element={<LessonPlans />} />
        <Route path="/communication" element={<Communication />} />
        <Route path="/parents-contact" element={<ParentsContact />} />
        <Route path="/homework" element={<Homework />} />
        <Route path="/class-management" element={<ClassManagement />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin-settings" element={<AdminSettings />} />
        
        {/* New isolated route for onboarding separate client schools */}
        <Route path="/onboard-client" element={<RegisterSchool />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;