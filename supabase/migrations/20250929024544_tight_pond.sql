@@ .. @@
 -- Create trigger to automatically grade clients when they are created or updated
-CREATE TRIGGER on_client_created_or_updated
-  AFTER INSERT OR UPDATE ON clients
+DROP TRIGGER IF EXISTS on_client_created ON clients;
+DROP TRIGGER IF EXISTS on_client_updated ON clients;
+
+CREATE OR REPLACE FUNCTION trigger_client_grading_wrapper()
+RETURNS TRIGGER AS $$
+BEGIN
+  -- Call the existing trigger_client_grading function
+  PERFORM trigger_client_grading();
+  RETURN COALESCE(NEW, OLD);
+END;
+$$ LANGUAGE plpgsql;
+
+CREATE TRIGGER on_client_created
+  AFTER INSERT ON clients
+  FOR EACH ROW
+  EXECUTE FUNCTION trigger_client_grading_wrapper();
+
+CREATE TRIGGER on_client_updated
+  AFTER UPDATE ON clients
   FOR EACH ROW
-  EXECUTE FUNCTION trigger_client_grading();