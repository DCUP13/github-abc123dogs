import React, { useState, useMemo } from 'react';
import {
  Send, CheckCircle, Eye, MousePointerClick, Reply, AlertTriangle, Repeat,
  TrendingUp, TrendingDown, Clock, BarChart3, Users, Globe, Zap, MessageSquare, Activity,
} from 'lucide-react';
import { useEmailAnalytics, AddressStats, DailyTrend } from '../lib/useEmailAnalytics';

interface AnalyticsDashboardProps {
  onSignOut: () => void;
  currentView: string;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const width = 100;
  const height = 30;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data
    .map((v, i) => `${i * step},${height - (v / max) * height}`)
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function MetricTile({
  label, value, sub, icon: Icon, color, trend, sparkColor,
}: {
  label: string; value: string; sub?: string; icon: React.ElementType;
  color: string; trend?: number[]; sparkColor?: string;
}) {
  return (
    <div className="app-card rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${color} flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && trend.length > 1 && (
        <div className="mt-3">
          <Sparkline data={trend} color={sparkColor || 'currentColor'} />
        </div>
      )}
    </div>
  );
}

function TrendChart({ trends }: { trends: DailyTrend[] }) {
  if (trends.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">No trend data yet.</p>;
  }
  const maxSent = Math.max(...trends.map(t => t.sent), 1);
  return (
    <div className="app-card rounded-xl p-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">30-Day Sending Trend</h3>
      <div className="flex items-end gap-1 h-32 overflow-x-auto">
        {trends.map(t => {
          const h = (t.sent / maxSent) * 100;
          return (
            <div key={t.date} className="flex-1 min-w-[8px] flex flex-col items-center group relative" style={{ minWidth: 8 }}>
              <div
                className="w-full rounded-t transition-all hover:opacity-80"
                style={{
                  height: `${Math.max(h, 2)}%`,
                  backgroundColor: 'var(--accent)',
                }}
                title={`${t.date}: ${t.sent} sent, ${t.opened} opened`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-400 dark:text-gray-500">
        <span>{trends[0]?.date.slice(5)}</span>
        <span>{trends[trends.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function BreakdownTable({ rows, label }: { rows: AddressStats[]; label: string }) {
  const [sort, setSort] = useState<keyof AddressStats>('sent');
  const sorted = useMemo(() => [...rows].sort((a, b) => (b[sort] as number) - (a[sort] as number)), [rows, sort]);

  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 py-4">No {label.toLowerCase()} data yet.</p>;
  }

  const headers: { key: keyof AddressStats; label: string }[] = [
    { key: 'address', label }, { key: 'sent', label: 'Sent' }, { key: 'delivered', label: 'Delivered' },
    { key: 'opened', label: 'Opened' }, { key: 'clicked', label: 'Clicked' }, { key: 'replied', label: 'Replied' },
    { key: 'bounced', label: 'Bounced' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
            {headers.map(h => (
              <th key={h.key} className="pb-2 pr-3 font-medium cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" onClick={() => h.key !== 'address' && setSort(h.key)}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.address} className="border-b border-gray-100 dark:border-gray-700/50">
              <td className="py-2 pr-3 text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{r.address}</td>
              <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{r.sent}</td>
              <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{r.delivered}</td>
              <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{r.opened}</td>
              <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{r.clicked}</td>
              <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{r.replied}</td>
              <td className="py-2 pr-3 text-red-500">{r.bounced}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsDashboard({ currentView }: AnalyticsDashboardProps) {
  const analytics = useEmailAnalytics();
  const o = analytics.overall;
  const [breakdownBy, setBreakdownBy] = useState<'address' | 'domain'>('address');

  const breakdown = breakdownBy === 'address' ? analytics.byAddress : analytics.byDomain;

  const sentTrend = analytics.trends.map(t => t.sent);
  const openTrend = analytics.trends.map(t => t.opened);

  // Engagement decline detection: compare last 7 days vs previous 7 days open rate
  const last7 = analytics.trends.slice(-7);
  const prev7 = analytics.trends.slice(-14, -7);
  const last7Opens = last7.reduce((s, t) => s + t.opened, 0);
  const prev7Opens = prev7.reduce((s, t) => s + t.opened, 0);
  const openTrendDir = last7Opens > prev7Opens ? 'up' : last7Opens < prev7Opens ? 'down' : 'flat';

  // Best performing address (by reply rate, min 5 sent)
  const bestPerformer = analytics.byAddress.find(a => a.sent >= 5);
  const bestPerformerRate = bestPerformer ? Math.round((bestPerformer.replied / bestPerformer.sent) * 100) : 0;

  if (analytics.loading) {
    return (
      <div className="p-4 md:p-8 app-bg min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 app-bg min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <BarChart3 className="w-7 h-7 text-purple-500" />
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
        </div>

        {/* Overview metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricTile label="Emails Sent" value={o.totalSent.toLocaleString()} icon={Send} color="bg-purple-100 text-purple-500 dark:bg-purple-900/20" trend={sentTrend} sparkColor="rgb(168 85 247)" />
          <MetricTile label="Delivered Rate" value={`${o.deliveredRate}%`} sub={`${o.totalDelivered} delivered`} icon={CheckCircle} color="bg-green-100 text-green-500 dark:bg-green-900/20" />
          <MetricTile label="Open Rate" value={`${o.openRate}%`} sub={`${o.totalOpened} opened`} icon={Eye} color="bg-blue-100 text-blue-500 dark:bg-blue-900/20" trend={openTrend} sparkColor="rgb(59 130 246)" />
          <MetricTile label="Reply Rate" value={`${o.replyRate}%`} sub={`${o.totalReplied} replied`} icon={Reply} color="bg-teal-100 text-teal-500 dark:bg-teal-900/20" />
          <MetricTile label="Click Rate" value={`${o.clickRate}%`} sub={`${o.totalClicked} clicked`} icon={MousePointerClick} color="bg-orange-100 text-orange-500 dark:bg-orange-900/20" />
          <MetricTile label="Second Opens" value={o.totalSecondOpens.toLocaleString()} sub="Opened 2+ times" icon={Repeat} color="bg-indigo-100 text-indigo-500 dark:bg-indigo-900/20" />
          <MetricTile label="Bounce Rate" value={`${o.bounceRate}%`} sub={`${o.totalBounced} bounced`} icon={AlertTriangle} color="bg-red-100 text-red-500 dark:bg-red-900/20" />
          <MetricTile label="Failed" value={o.totalFailed.toLocaleString()} icon={AlertTriangle} color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20" />
        </div>

        {/* Trend chart */}
        <div className="mb-8">
          <TrendChart trends={analytics.trends} />
        </div>

        {/* Insights row */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="app-card rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Best Send Times</h3>
            </div>
            {analytics.bestSendHours.length > 0 ? (
              <div className="space-y-1.5">
                {analytics.bestSendHours.map(h => (
                  <div key={h.hour} className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      {h.hour === 0 ? '12 AM' : h.hour < 12 ? `${h.hour} AM` : h.hour === 12 ? '12 PM' : `${h.hour - 12} PM`}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">{h.count} sent</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400 dark:text-gray-500">No data yet.</p>}
          </div>

          <div className="app-card rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Best Performer</h3>
            </div>
            {bestPerformer ? (
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{bestPerformer.address}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{bestPerformerRate}% reply rate</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{bestPerformer.replied} of {bestPerformer.sent} replied</p>
              </div>
            ) : <p className="text-sm text-gray-400 dark:text-gray-500">Need 5+ sent from an address.</p>}
          </div>

          <div className="app-card rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-teal-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Engagement Trend</h3>
            </div>
            <div className="flex items-center gap-2">
              {openTrendDir === 'up' ? (
                <><TrendingUp className="w-5 h-5 text-green-500" /><span className="text-sm text-green-600 dark:text-green-400">Improving</span></>
              ) : openTrendDir === 'down' ? (
                <><TrendingDown className="w-5 h-5 text-red-500" /><span className="text-sm text-red-600 dark:text-red-400">Declining</span></>
              ) : (
                <><Activity className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-500">Stable</span></>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Last 7 days vs previous 7 days opens.
            </p>
          </div>
        </div>

        {/* Breakdown tables */}
        <div className="app-card rounded-xl p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {breakdownBy === 'address' ? 'Per-Email-Address Breakdown' : 'Per-Domain Breakdown'}
            </h3>
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <button onClick={() => setBreakdownBy('address')} className={`px-3 py-1 text-xs rounded-md transition-colors ${breakdownBy === 'address' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>By Address</button>
              <button onClick={() => setBreakdownBy('domain')} className={`px-3 py-1 text-xs rounded-md transition-colors ${breakdownBy === 'domain' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>By Domain</button>
            </div>
          </div>
          <BreakdownTable rows={breakdown} label={breakdownBy === 'address' ? 'Address' : 'Domain'} />
        </div>

        {/* Campaign insights */}
        <div className="app-card rounded-xl p-6 shadow-sm mb-8">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Campaign Insights
          </h3>
          {analytics.campaigns.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4">No campaigns yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                    <th className="pb-2 pr-3 font-medium">Campaign</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 pr-3 font-medium">Sent</th>
                    <th className="pb-2 pr-3 font-medium">Planned</th>
                    <th className="pb-2 pr-3 font-medium">Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.campaigns.map(c => {
                    const statusColors: Record<string, string> = { active: 'text-green-500', paused: 'text-yellow-500', completed: 'text-blue-500', draft: 'text-gray-400' };
                    return (
                      <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-2 pr-3 text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{c.name}</td>
                        <td className={`py-2 pr-3 capitalize ${statusColors[c.status] || 'text-gray-400'}`}>{c.status}</td>
                        <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{c.sentCount}</td>
                        <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{c.totalCount}</td>
                        <td className="py-2 pr-3 text-red-500">{c.failedCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Autoresponder status */}
        <div className="app-card rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-teal-500" />
            Autoresponder Status
          </h3>
          {analytics.autoresponders.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4">No email addresses configured yet.</p>
          ) : (
            <div className="space-y-2">
              {analytics.autoresponders.map(a => (
                <div key={a.address} className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{a.address}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{a.handledCount} emails handled</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {a.autoresponderEnabled ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">Auto ON</span>
                    ) : a.draftsEnabled ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">Drafts</span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Off</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

void Globe;
