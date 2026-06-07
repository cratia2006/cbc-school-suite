import { useEffect } from "react";
import { supabase } from "../services/supabase";

function TestConnection() {
  useEffect(() => {
    console.log("Supabase connected:", supabase);
  }, []);

  return (
    <div>
      <h2>Supabase Connected</h2>
    </div>
  );
}

export default TestConnection;