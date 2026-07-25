import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

export interface AddressStats {
  address: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  failed: number;
  secondOpens: number;
}

export interface OverallStats {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  totalBounced: number;
  totalFailed: number;
  totalSecondOpens: number;
  deliveredRate: number;
  openRate: number;
  replyRate: number;
  clickRate: number;
  bounceRate: number;
}

export interface DailyTrend {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
}

export interface CampaignInsight {
  id: string;
  name: string;
  status: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
}

export interface AutoresponderStatus {
  address: string;
  autoresponderEnabled: boolean;
  draftsEnabled: boolean;
  handledCount: number;
}

export interface EmailAnalytics {
  overall: OverallStats;
  byAddress: AddressStats[];
  byDomain: AddressStats[];
  trends: DailyTrend[];
  campaigns: CampaignInsight[];
  autoresponders: AutoresponderStatus[];
  bestSendHours: { hour: number; count: number }[];
  loading: boolean;
}

const emptyOverall: OverallStats = {
  totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0,
  totalReplied: 0, totalBounced: 0, totalFailed: 0, totalSecondOpens: 0,
  deliveredRate: 0, openRate: 0, replyRate: 0, clickRate: 0, bounceRate: 0,
};

const emptyAnalytics: EmailAnalytics = {
  overall: emptyOverall,
  byAddress: [], byDomain: [], trends: [], campaigns: [], autoresponders: [],
  bestSendHours: [], loading: true,
};

function domainFromEmail(email: string): string {
  const parts = email.split('@');
  return parts.length > 1 ? parts[1] : email;
}

function computeRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function useEmailAnalytics(): EmailAnalytics & { refresh: () => void } {
  const [analytics, setAnalytics] = useState<EmailAnalytics>(emptyAnalytics);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { if (mounted) setAnalytics({ ...emptyAnalytics, loading: false }); return; }
      const userId = session.user.id;

      try {
        const [
          sentRes,
          sesEmailsRes,
          googleEmailsRes,
          campaignsRes,
          secondOpensRes,
        ] = await Promise.all([
          supabase
            .from('email_sent')
            .select('from_email, delivered_at, opened_at, clicked_at, bounced_at, failed_at, reply_count, sent_at')
            .eq('user_id', userId)
            .order('sent_at', { ascending: false })
            .limit(5000),
          supabase
            .from('amazon_ses_emails')
            .select('address, autoresponder_enabled, drafts_enabled')
            .eq('user_id', userId),
          supabase
            .from('google_smtp_emails')
            .select('address, autoresponder_enabled, drafts_enabled')
            .eq('user_id', userId),
          supabase
            .from('crm_campaigns')
            .select('id, name, status, total_count, sent_count, failed_count, skipped_count, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('email_events')
            .select('email_sent_id')
            .in('event_type', ['open']),
        ]);

        const sentRows = (sentRes.data || []) as Array<{
          from_email: string; delivered_at: string | null; opened_at: string | null;
          clicked_at: string | null; bounced_at: string | null; failed_at: string | null;
          reply_count: number | null; sent_at: string | null;
        }>;

        // Compute second opens from email_events
        const openCounts = new Map<string, number>();
        for (const row of (secondOpensRes.data || []) as Array<{ email_sent_id: string | null }>) {
          if (row.email_sent_id) {
            openCounts.set(row.email_sent_id, (openCounts.get(row.email_sent_id) || 0) + 1);
          }
        }
        const secondOpenEmailIds = new Set(
          [...openCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id)
        );

        // Per-address aggregation
        const addressMap = new Map<string, AddressStats>();
        const domainMap = new Map<string, AddressStats>();

        for (const row of sentRows) {
          const addr = row.from_email || 'unknown';
          const dom = domainFromEmail(addr);

          if (!addressMap.has(addr)) {
            addressMap.set(addr, {
              address: addr, sent: 0, delivered: 0, opened: 0, clicked: 0,
              replied: 0, bounced: 0, failed: 0, secondOpens: 0,
            });
          }
          const a = addressMap.get(addr)!;
          a.sent++;
          if (row.delivered_at) a.delivered++;
          if (row.opened_at) a.opened++;
          if (row.clicked_at) a.clicked++;
          if ((row.reply_count || 0) > 0) a.replied++;
          if (row.bounced_at) a.bounced++;
          if (row.failed_at) a.failed++;

          if (!domainMap.has(dom)) {
            domainMap.set(dom, {
              address: dom, sent: 0, delivered: 0, opened: 0, clicked: 0,
              replied: 0, bounced: 0, failed: 0, secondOpens: 0,
            });
          }
          const d = domainMap.get(dom)!;
          d.sent++;
          if (row.delivered_at) d.delivered++;
          if (row.opened_at) d.opened++;
          if (row.clicked_at) d.clicked++;
          if ((row.reply_count || 0) > 0) d.replied++;
          if (row.bounced_at) d.bounced++;
          if (row.failed_at) d.failed++;
        }

        // Overall totals
        const totalSent = sentRows.length;
        const totalDelivered = sentRows.filter(r => r.delivered_at).length;
        const totalOpened = sentRows.filter(r => r.opened_at).length;
        const totalClicked = sentRows.filter(r => r.clicked_at).length;
        const totalReplied = sentRows.filter(r => (r.reply_count || 0) > 0).length;
        const totalBounced = sentRows.filter(r => r.bounced_at).length;
        const totalFailed = sentRows.filter(r => r.failed_at).length;
        const totalSecondOpens = secondOpenEmailIds.size;

        // Daily trends (last 30 days)
        const trendMap = new Map<string, DailyTrend>();
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          trendMap.set(key, {
            date: key, sent: 0, delivered: 0, opened: 0,
            clicked: 0, replied: 0, bounced: 0,
          });
        }
        for (const row of sentRows) {
          if (!row.sent_at) continue;
          const key = row.sent_at.slice(0, 10);
          const t = trendMap.get(key);
          if (!t) continue;
          t.sent++;
          if (row.delivered_at) t.delivered++;
          if (row.opened_at) t.opened++;
          if (row.clicked_at) t.clicked++;
          if ((row.reply_count || 0) > 0) t.replied++;
          if (row.bounced_at) t.bounced++;
        }

        // Best send hours
        const hourMap = new Map<number, number>();
        for (const row of sentRows) {
          if (!row.sent_at) continue;
          const hour = new Date(row.sent_at).getHours();
          hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
        }
        const bestSendHours = [...hourMap.entries()]
          .map(([hour, count]) => ({ hour, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Autoresponder statuses
        const allEmailSettings = [
          ...((sesEmailsRes.data || []) as Array<{ address: string; autoresponder_enabled: boolean | null; drafts_enabled: boolean | null }>),
          ...((googleEmailsRes.data || []) as Array<{ address: string; autoresponder_enabled: boolean | null; drafts_enabled: boolean | null }>),
        ];
        const autoresponders: AutoresponderStatus[] = allEmailSettings.map(e => ({
          address: e.address,
          autoresponderEnabled: e.autoresponder_enabled || false,
          draftsEnabled: e.drafts_enabled || false,
          handledCount: addressMap.get(e.address)?.sent || 0,
        }));

        const campaigns: CampaignInsight[] = (campaignsRes.data || []) as CampaignInsight[];

        const byAddress = [...addressMap.values()].sort((a, b) => b.sent - a.sent);
        const byDomain = [...domainMap.values()].sort((a, b) => b.sent - a.sent);

        if (mounted) {
          setAnalytics({
            overall: {
              totalSent, totalDelivered, totalOpened, totalClicked, totalReplied,
              totalBounced, totalFailed, totalSecondOpens,
              deliveredRate: computeRate(totalDelivered, totalSent),
              openRate: computeRate(totalOpened, totalDelivered),
              replyRate: computeRate(totalReplied, totalSent),
              clickRate: computeRate(totalClicked, totalSent),
              bounceRate: computeRate(totalBounced, totalSent),
            },
            byAddress, byDomain,
            trends: [...trendMap.values()],
            campaigns, autoresponders, bestSendHours,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Error loading email analytics:', error);
        if (mounted) setAnalytics({ ...emptyAnalytics, loading: false });
      }
    };

    load();
    return () => { mounted = false; };
  }, [refreshKey]);

  return { ...analytics, refresh };
}
