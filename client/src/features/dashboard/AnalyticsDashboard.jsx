import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const LANG_NAMES = {
  'en': 'English',
  'hi': 'Hindi (हिन्दी)',
  'gu': 'Gujarati (ગુજરાતી)',
  'hi-Latn': 'Hinglish',
  'gu-Latn': 'Gujlish'
};

export default function AnalyticsDashboard({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [includeSeeded, setIncludeSeeded] = useState('true');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bannerMessage, setBannerMessage] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [includeSeeded, startDate, endDate]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/analytics/overview`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          includeSeeded,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to load analytics overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = (tableType) => {
    const url = `${API_BASE}/admin/analytics/export-csv?table=${tableType}&includeSeeded=${includeSeeded}&token=${token}`;
    // Using authenticated download link
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `analytics_${tableType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateTrainingExample = async (unanswered) => {
    try {
      await axios.post(
        `${API_BASE}/admin/feedback`,
        {
          messageId: `curated_${Date.now()}`,
          sessionId: 'analytics_curation',
          query: unanswered.sampleQuery || unanswered.normalizedQuery,
          rating: 'implicit_failure',
          reason: 'implicit_fallback',
          comment: `Curated from Analytics Dashboard (Occurred ${unanswered.count} times)`,
          pipelineSnapshot: {
            language: unanswered.language || 'en',
            intent: 'out_of_scope',
            decision: unanswered.decision || 'FALLBACK'
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBannerMessage(`Added "${unanswered.sampleQuery}" to Part 10 Admin Review Queue!`);
      setTimeout(() => setBannerMessage(''), 4000);
    } catch (err) {
      console.error('Failed to create training item:', err);
    }
  };

  if (loading && !data) {
    return <div className="p-8 text-center text-slate-500 text-xs">Loading analytics dashboard...</div>;
  }

  const kpis = data?.kpis || {};
  const queriesOverTime = data?.queriesOverTime || [];
  const topIntents = data?.topIntents || [];
  const languageDist = (data?.languageDistribution || []).map((l) => ({
    name: LANG_NAMES[l.language] || l.language,
    count: l.count
  }));
  const topUnanswered = data?.topUnanswered || [];
  const docUsage = data?.docUsage || [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">Production AI Analytics & Observability</h2>
            {includeSeeded === 'true' && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                Seeded Demo Data Active
              </span>
            )}
            {data?.executionTimeMs !== undefined && (
              <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ⚡ Aggregated in {data.executionTimeMs} ms
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time intent frequencies, student language distributions, fallback monitoring, and latency SLA.
          </p>
        </div>

        {/* Date & Demo Toggle Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium pl-1">Data:</span>
            <select
              value={includeSeeded}
              onChange={(e) => setIncludeSeeded(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700"
            >
              <option value="true">Include Demo Seed (2,000 logs)</option>
              <option value="false">Live Production Traffic Only</option>
              <option value="only">Seeded Data Only</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-xs text-slate-700"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-xs text-slate-700"
            />
          </div>

          <button
            onClick={fetchAnalytics}
            className="text-xs px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 font-semibold text-white rounded-xl shadow-sm transition-all"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {bannerMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-medium">
          ✓ {bannerMessage}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium uppercase">Total Queries</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{kpis.totalQueries?.toLocaleString() || 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium uppercase">Cache Hit Rate</div>
          <div className="text-xl font-bold text-indigo-600 mt-1">{kpis.cacheHitRate || 0}%</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium uppercase">Satisfaction</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{kpis.satisfactionRate || 100}%</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium uppercase">Unanswered Rate</div>
          <div className="text-xl font-bold text-rose-600 mt-1">{kpis.unansweredRate || 0}%</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium uppercase">Clarification Rate</div>
          <div className="text-xl font-bold text-amber-600 mt-1">{kpis.clarificationRate || 0}%</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium uppercase">Avg Latency</div>
          <div className="text-xl font-bold text-slate-800 mt-1">{kpis.avgLatencyMs || 0} ms</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium uppercase">p95 Latency</div>
          <div className="text-xl font-bold text-violet-600 mt-1">{kpis.p95LatencyMs || 0} ms</div>
        </div>
      </div>

      {/* Row 1: Queries Over Time Line Chart & Language Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Queries Over Time (Daily)</h3>
              <p className="text-[11px] text-slate-400">Total volume vs. unanswered and cached hits</p>
            </div>
            <button
              onClick={() => handleExportCsv('traffic')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Export CSV 📥
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={queriesOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="count" name="Total Queries" stroke="#4f46e5" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cached" name="Cached Queries" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="unanswered" name="Unanswered" stroke="#f43f5e" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Language Distribution Pie Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">Language Distribution</h3>
            <p className="text-[11px] text-slate-400 mb-4">Native Indic & code-mixed scripts</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={languageDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {languageDist.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] mt-2 justify-center">
            {languageDist.map((item, idx) => (
              <span key={idx} className="flex items-center gap-1 font-medium text-slate-600">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                {item.name}: {item.count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Top 20 Intents Bar Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Top Intents Frequency</h3>
            <p className="text-[11px] text-slate-400">Classified student question intents</p>
          </div>
          <button
            onClick={() => handleExportCsv('intents')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            Export CSV 📥
          </button>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topIntents}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="intent" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
              <Bar dataKey="count" name="Queries" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Top Unanswered Queries Table with "Create Training Example" Action */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Top Unanswered & Fallback Queries</h3>
            <p className="text-[11px] text-slate-400">
              High-frequency knowledge gaps. Send directly to the Feature 10 review queue to generate new training samples.
            </p>
          </div>
          <button
            onClick={() => handleExportCsv('unanswered')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            Export CSV 📥
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Sample Student Query</th>
                <th className="p-3">Language</th>
                <th className="p-3">Decision</th>
                <th className="p-3">Occurrences</th>
                <th className="p-3">Last Seen</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topUnanswered.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-medium text-slate-900 max-w-md">
                    {row.sampleQuery || row.normalizedQuery}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                      {row.language}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      {row.decision}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-slate-700">{row.count}</td>
                  <td className="p-3 text-slate-400 text-[11px]">
                    {new Date(row.lastSeen).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleCreateTrainingExample(row)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-sm transition-all"
                    >
                      + Create Training Example
                    </button>
                  </td>
                </tr>
              ))}
              {topUnanswered.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-400 text-xs">
                    No unanswered queries recorded in this time window!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

