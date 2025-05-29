-- Insert statistics for existing users who don't have a row yet
INSERT INTO dashboard_statistics (
  user_id,
  total_emails_remaining,
  total_email_accounts,
  total_emails_sent_today,
  total_templates
)
SELECT 
  p.id as user_id,
  COALESCE(
    (SELECT SUM(daily_limit - sent_emails)
     FROM (
       SELECT daily_limit, sent_emails FROM amazon_ses_emails WHERE user_id = p.id
       UNION ALL
       SELECT daily_limit, sent_emails FROM google_smtp_emails WHERE user_id = p.id
     ) AS all_emails
    ), 0
  ) as total_emails_remaining,
  COALESCE(
    (SELECT COUNT(*)
     FROM (
       SELECT id FROM amazon_ses_emails WHERE user_id = p.id
       UNION ALL
       SELECT id FROM google_smtp_emails WHERE user_id = p.id
     ) AS all_accounts
    ), 0
  ) as total_email_accounts,
  COALESCE(
    (SELECT SUM(sent_emails)
     FROM (
       SELECT sent_emails FROM amazon_ses_emails WHERE user_id = p.id
       UNION ALL
       SELECT sent_emails FROM google_smtp_emails WHERE user_id = p.id
     ) AS all_sent
    ), 0
  ) as total_emails_sent_today,
  COALESCE(
    (SELECT COUNT(*) FROM templates WHERE user_id = p.id), 0
  ) as total_templates
FROM profiles p
LEFT JOIN dashboard_statistics ds ON ds.user_id = p.id
WHERE ds.id IS NULL;