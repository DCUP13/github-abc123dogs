@@ .. @@
 -- Trigger to automatically grade clients when created or updated
 CREATE OR REPLACE FUNCTION trigger_client_grading()
 RETURNS TRIGGER AS $$
 BEGIN
   -- Call the grade-client edge function asynchronously
   PERFORM net.http_post(
     url := current_setting('app.supabase_url') || '/functions/v1/grade-client',
     headers := jsonb_build_object(
       'Content-Type', 'application/json',
       'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
     ),
     body := jsonb_build_object(
       'client_id', NEW.id,
       'user_id', NEW.user_id,
       'client_data', row_to_json(NEW)
     )
   );
   
   RETURN NEW;
 END;
 $$ LANGUAGE plpgsql;
 
-CREATE TRIGGER on_client_created
-  AFTER INSERT ON clients
+CREATE TRIGGER on_client_created_or_updated
+  AFTER INSERT OR UPDATE ON clients
   FOR EACH ROW
   EXECUTE FUNCTION trigger_client_grading();