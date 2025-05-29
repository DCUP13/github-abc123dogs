-- Update existing statistics with campaign counts
UPDATE dashboard_statistics ds
SET total_campaigns = (
  SELECT COUNT(*)
  FROM campaigns c
  WHERE c.user_id = ds.user_id
);