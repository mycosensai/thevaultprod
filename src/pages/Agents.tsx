/**
 * Agent Fleet Dashboard — The Vault Business Control Center
 * GeneralStaff-inspired warm cream / ink / rust palette
 */

import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Bot, Play, Pause, CheckCircle, XCircle, Clock, TrendingUp, Activity, Shield, MessageSquare, Zap, BarChart3, Globe, FileText, Users, Search, DollarSign, Lock } from "lucide-react";

const AGENT_ICONS: Record<string, React.ReactNode> = {
  appraiser: <DollarSign className="w-5 h-5" />,
  outreach: <Globe className="w-5 h-5" />,
  proverify: <Shield className="w-5 h-5" />,
  content: <FileText className="w-5 h-5" />,
  security: <Lock className="w-5 h-5" />,
  pricing: <BarChart3 className="w-5 h-5" />,
  support: <Users className="w-5 h-5" />,
  listing: <Search className="w-5 h-5" />,
  compliance: <CheckCircle className="w-5 h-5" />,
  social: <MessageSquare className="w-5 h-5" />,
};

const STATUS_COLORS: Record<string, string> = {
  verified: "text-green-600 bg-green-50",
  verification_failed: "text-red-600 bg-red-50",
  verified_weak: "text-amber-600 bg-amber-50",
  running: "text-blue-600 bg-blue-50 animate-pulse",
  complete: "text-green-600 bg-green-50",
  failed: "text-red-600 bg-red-50",
  active: "text-blue-600 bg-blue-50",
  pending: "text-slate-600 bg-slate-50",
};

export default function Agents() {
  const { isAdmin } = useAuth();
  const utils = trpc.useContext();

  const { data: stats } = trpc.agent.dashboardStats.useQuery();
  const { data: fleet } = trpc.agent.fleetOverview.useQuery();
  const { data: sessions } = trpc.agent.listSessions.useQuery({ limit: 10 });
  const seedProjects = trpc.agent.seedProjects.useMutation({
    onSuccess: () => { utils.agent.dashboardStats.invalidate(); utils.agent.fleetOverview.invalidate(); }
  });
  const seedTasks = trpc.agent.seedTasks.useMutation({
    onSuccess: () => { utils.agent.fleetOverview.invalidate(); utils.agent.listSessions.invalidate(); }
  });
  const runSession = trpc.agent.runSession.useMutation({
    onSuccess: () => { utils.agent.listSessions.invalidate(); utils.agent.fleetOverview.invalidate(); utils.agent.dashboardStats.invalidate(); }
  });

  const recentLogs = sessions?.slice(0, 5) ?? [];

  return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Masthead */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">
            Agent Fleet Control
          </h1>
          <p className="mt-2 text-slate-600 font-serif italic">
            Autonomous business operations for The Vault — ten specialized agents, one mission: sell luxury.
          </p>
        </div>

        {/* Stats Band */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Projects" value={stats?.projects ?? 0} icon={<Activity className="w-4 h-4" />} />
          <StatCard label="Pending Tasks" value={stats?.pendingTasks ?? 0} icon={<Clock className="w-4 h-4" />} accent />
          <StatCard label="Cycles Run" value={stats?.totalCycles ?? 0} icon={<Zap className="w-4 h-4" />} />
          <StatCard label="Pass Rate" value={`${stats?.passRate ?? 0}%`} icon={<TrendingUp className="w-4 h-4" />} green />
          <StatCard label="Verified" value={stats?.totalVerified ?? 0} icon={<CheckCircle className="w-4 h-4" />} green />
          <StatCard label="Failed" value={stats?.totalFailed ?? 0} icon={<XCircle className="w-4 h-4" />} red />
        </div>

        {/* Admin Seed */}
        {isAdmin && (!fleet || fleet.length === 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
            <p className="text-amber-800 font-medium mb-2">Agent fleet not initialized</p>
            <div className="flex gap-2">
              <button onClick={() => seedProjects.mutate()} className="px-4 py-2 bg-amber-700 text-white rounded hover:bg-amber-800 text-sm">
                Seed Projects
              </button>
              <button onClick={() => seedTasks.mutate()} className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-800 text-sm">
                Seed Tasks
              </button>
            </div>
          </div>
        )}

        {/* Fleet Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900">Fleet Overview</h2>
            <p className="text-sm text-slate-500 mt-0.5">Ten autonomous agents managing The Vault's operations</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Agent</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Mission</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-700">Cycles</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-700">Pass</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-700">Fail</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-700">Queue</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-700">Mode</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fleet?.map((row) => (
                  <tr key={row.projectId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{AGENT_ICONS[row.projectId] ?? <Bot className="w-5 h-5" />}</span>
                        <div>
                          <Link to={`/agents/${row.projectId}`} className="font-medium text-slate-900 hover:text-amber-700">
                            {row.name}
                          </Link>
                          <p className="text-xs text-slate-500 font-mono">{row.projectId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{row.mission || "—"}</td>
                    <td className="px-4 py-3 text-center font-mono text-slate-700">{row.totalCycles}</td>
                    <td className="px-4 py-3 text-center font-mono text-green-600">{row.totalVerified}</td>
                    <td className="px-4 py-3 text-center font-mono text-red-600">{row.totalFailed}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.botPickable > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
                        {row.botPickable}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.mode === "A" ? "bg-green-100 text-green-700" : row.mode === "B" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                        {row.mode === "A" ? "Auto" : row.mode === "B" ? "Assist" : "Pipeline"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link to={`/agents/${row.projectId}`} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded" title="View">
                          <BarChart3 className="w-4 h-4" />
                        </Link>
                        {isAdmin && row.botPickable > 0 && (
                          <button
                            onClick={() => runSession.mutate({ projectId: row.projectId, budgetMinutes: 15, maxCycles: 5 })}
                            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                            title="Run Session"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!fleet || fleet.length === 0) && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No agents registered yet. Click "Seed Projects" above to initialize.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-900">Recent Sessions</h2>
            </div>
            <div className="p-4 space-y-3">
              {recentLogs.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No sessions recorded yet.</p>
              )}
              {recentLogs.map((s) => (
                <div key={s.sessionId} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${s.status === "complete" ? "bg-green-500" : s.status === "failed" ? "bg-red-500" : "bg-blue-500 animate-pulse"}`} />
                      <span className="font-mono text-sm text-slate-700">{s.sessionId}</span>
                      <span className="text-xs text-slate-400">{s.projectId}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {s.totalCycles} cycles · {s.totalVerified}/{s.totalCycles} passed · {s.durationMinutes ?? 0}m · {s.stopReason ?? "—"}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mission Card */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-900">The Vault Mission</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-900">The Vault</strong> is a luxury elite collector exchange marketplace at <em>thevaultdfw.win</em>. We connect serious collectors with authenticated, verified luxury items — watches, jewelry, art, cars, memorabilia, and rare collectibles.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <strong className="text-slate-900 block mb-1">Zero Funds Held</strong>
                  <span className="text-slate-600">Direct seller payouts. We never hold your money.</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <strong className="text-slate-900 block mb-1">ProVerify</strong>
                  <span className="text-slate-600">12-expert verification with 0-100 scoring.</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <strong className="text-slate-900 block mb-1">Blockchain Certs</strong>
                  <span className="text-slate-600">Solana NFT certificates of authenticity.</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <strong className="text-slate-900 block mb-1">AI Outreach</strong>
                  <span className="text-slate-600">24/7 professional buyer discovery engine.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

function StatCard({ label, value, icon, accent, green, red }: { label: string; value: string | number; icon: React.ReactNode; accent?: boolean; green?: boolean; red?: boolean }) {
  return (
    <div className={`bg-white border rounded-lg p-4 ${accent ? "border-amber-200" : green ? "border-green-200" : red ? "border-red-200" : "border-slate-200"}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`${accent ? "text-amber-600" : green ? "text-green-600" : red ? "text-red-500" : "text-slate-500"}`}>{icon}</span>
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-2xl font-bold font-mono ${accent ? "text-amber-700" : green ? "text-green-700" : red ? "text-red-600" : "text-slate-900"}`}>
        {value}
      </div>
    </div>
  );
}
