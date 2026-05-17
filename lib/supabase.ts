import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://hhbekuiyrcgoghpurljm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoYmVrdWl5cmNnb2docHVybGptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTI2MjksImV4cCI6MjA5NDQyODYyOX0.-t5hSyiJkWl6tsUjoaYnKe5F9Qo2UR1S1G28jca69Zw"
);