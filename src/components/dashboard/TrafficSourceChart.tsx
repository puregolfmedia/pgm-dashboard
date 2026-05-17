'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { TrafficSource } from '@/types/dashboard'

const COLORS = ['#006648', '#2d8a66', '#5aae84', '#87d2a2', '#b4f0c0', '#C6C6C6', '#a8a8a8', '#8a8a8a']

export default function TrafficSourceChart({ data }: { data: TrafficSource[] }) {
  return (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5">
      <h2 className="text-sm font-medium text-pgm-ink mb-5">Traffic source</h2>
      {data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No traffic data for this period</div>
      ) : <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#C6C6C6" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="source"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            width={90}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #E8E8E8', fontSize: 12 }}
            cursor={{ fill: '#f9fafb' }}
          />
          <Bar dataKey="sessions" name="Sessions" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>}
    </div>
  )
}
