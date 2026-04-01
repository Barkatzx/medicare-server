import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Explicitly load .env from root directory
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Debug: Check if variables are loaded (remove in production)
console.log("Checking environment variables:");
console.log("SUPABASE_URL exists:", !!process.env.SUPABASE_URL);
console.log("SUPABASE_ANON_KEY exists:", !!process.env.SUPABASE_ANON_KEY);

// Validate required variables
if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL is not defined in environment variables");
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_ANON_KEY is not defined in environment variables");
}

// Create Supabase clients
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
);
