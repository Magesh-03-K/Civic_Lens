'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { Priority } from '@/lib/severity';

interface DashboardChartsProps {
  reports: Array<{
    status: string;
    priority: Priority;
    departmentName: string;
    slaBreached: boolean;
  }>;
  avgResolutionHours: Record<string, number>;
}

export default function DashboardCharts({ reports, avgResolutionHours }: DashboardChartsProps) {
  // Chart 1: Open vs Resolved by Priority
  const priorityOrder: Priority[] = ['P1', 'P2', 'P3', 'P4'];
  const priorityChartData = priorityOrder.map((p) => {
    const priorityReports = reports.filter((r) => r.priority === p);
    const open = priorityReports.filter((r) => r.status !== 'resolved').length;
    const resolved = priorityReports.filter((r) => r.status === 'resolved').length;
    return {
      priority: p,
      Open: open,
      Resolved: resolved,
    };
  });

  // Chart 2: Average Resolution Hours per Department
  const departmentChartData = Object.entries(avgResolutionHours).map(([dept, hours]) => {
    // Shorten long department names for readable labels
    const shortName = dept.replace(/Madurai Corporation – |Tamil Nadu |TWAD \/ /gi, '').trim();
    return {
      department: shortName.slice(0, 16),
      hours,
    };
  });

  // Chart 3: SLA Performance (Within SLA vs Breached)
  const breachedCount = reports.filter((r) => r.slaBreached).length;
  const onTimeCount = reports.length - breachedCount;

  const slaChartData = [
    { name: 'Within SLA', count: onTimeCount, color: '#16a34a' },
    { name: 'SLA Breached', count: breachedCount, color: '#dc2626' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chart 1: Open vs Resolved by Priority */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Incidents by Priority</h3>
          <p className="text-xs text-slate-500 mb-4">Open vs resolved count across P1–P4</p>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priorityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Open" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Avg Resolution Hours per Department */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Avg Resolution Hours</h3>
          <p className="text-xs text-slate-500 mb-4">Average turnaround time by department</p>
        </div>
        <div className="h-56 w-full">
          {departmentChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
              Awaiting resolved reports data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentChartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                <XAxis
                  dataKey="department"
                  tick={{ fontSize: 9 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [`${value} hrs`, 'Avg Time']} />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 3: SLA Performance */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">SLA Compliance</h3>
          <p className="text-xs text-slate-500 mb-4">Timely triage vs breached deadlines</p>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={slaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {slaChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
