@@ .. @@
 /*
   # Create autoresponder trigger function
 
   Creates a trigger that calls the autoresponder edge function whenever a new email is received.
+  
+  BEFORE RUNNING: Replace the following placeholders with your actual values:
+  - SUPABASE_URL: Your full Supabase URL (e.g., https://abcdefghijklmnop.supabase.co)
+  - SUPABASE_PROJECT_REF: Your project reference (e.g., abcdefghijklmnop)  
+  - SUPABASE_SERVICE_ROLE_KEY: Your service role key (starts with eyJ...)
+  
+  Find these values in Supabase Dashboard → Settings → API
 */