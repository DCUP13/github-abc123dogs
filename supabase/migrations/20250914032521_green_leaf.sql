@@ .. @@
 /*
   # Create autoresponder trigger for emails
   
-  IMPORTANT: Before running this migration, replace the following placeholders:
-  - SUPABASE_URL: Your full Supabase URL (e.g., https://abcdefghijklmnop.supabase.co)
-  - SUPABASE_PROJECT_REF: Your project reference (e.g., abcdefghijklmnop)
-  - SUPABASE_SERVICE_ROLE_KEY: Your service role key (starts with eyJ...)
+  IMPORTANT: Before running this migration, replace:
+  - your-project-ref: Your project reference (e.g., abcdefghijklmnop)
+  - your-service-role-key: Your service role key (starts with eyJ...)
   
   1. New Functions
     - `trigger_autoresponder()` - Calls autoresponder edge function when email is received
@@ .. @@
 CREATE OR REPLACE FUNCTION trigger_autoresponder()
 RETURNS TRIGGER AS $$
 DECLARE
-    supabase_url text;
-    project_ref text;
-    service_role_key text;
-    function_url text;
     http_request_id bigint;
     response_data jsonb;
 BEGIN
     -- Log that trigger fired
     RAISE NOTICE 'AUTORESPONDER TRIGGER FIRED! Email ID: %, From: %, To: %', 
         NEW.id, NEW.sender, array_to_string(NEW.receiver, ', ');
     
-    -- Get configuration from environment
-    supabase_url := current_setting('app.settings.supabase_url', true);
-    project_ref := current_setting('app.settings.supabase_project_ref', true);
-    service_role_key := current_setting('app.settings.supabase_service_role_key', true);
-    
-    -- Build function URL
-    IF supabase_url IS NOT NULL AND supabase_url != '' THEN
-        function_url := supabase_url || '/functions/v1/autoresponder';
-    ELSIF project_ref IS NOT NULL AND project_ref != '' THEN
-        function_url := 'https://' || project_ref || '.supabase.co/functions/v1/autoresponder';
-    ELSE
-        function_url := 'https://SUPABASE_PROJECT_REF.supabase.co/functions/v1/autoresponder';
-    END IF;
-    
-    -- Use service role key if available, otherwise use placeholder
-    IF service_role_key IS NULL OR service_role_key = '' THEN
-        service_role_key := 'SUPABASE_SERVICE_ROLE_KEY';
-    END IF;
-    
-    RAISE NOTICE 'Calling autoresponder at URL: %', function_url;
+    RAISE NOTICE 'Calling autoresponder function...';
     
     -- Call the autoresponder edge function
     SELECT INTO http_request_id, response_data
         net.http_post(
-            url := function_url,
+            url := 'https://your-project-ref.supabase.co/functions/v1/autoresponder',
             headers := jsonb_build_object(
                 'Content-Type', 'application/json',
-                'Authorization', 'Bearer ' || service_role_key
+                'Authorization', 'Bearer ' || 'your-service-role-key'
             ),
             body := jsonb_build_object(
                 'email_id', NEW.id,
                 'sender', NEW.sender,
                 'receiver', NEW.receiver,
                 'subject', NEW.subject,
                 'body', NEW.body,
                 'created_at', NEW.created_at
             )
         );
     
     RAISE NOTICE 'HTTP request completed with ID: %, Response: %', http_request_id, response_data;
     
     RETURN NEW;
     
 EXCEPTION WHEN OTHERS THEN
     RAISE NOTICE 'HTTP request failed: %', SQLERRM;
     RETURN NEW; -- Don't fail the email insert
 END;
 $$ LANGUAGE plpgsql;