'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { DailyBooking } from '@/types/dashboard'

function formatDate(dateStr: string) {
  const d = new Date(dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'))
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function BookingsByDayChart({ data }: { data: DailyBooking[] }) {
  const chartData = data.map((d) => ({ ...d, label: formatDate(d.date) }))

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5">
      <h2 className="text-sm font-medium text-pgm-ink mb-5">Booking starts by day</h2>
      {chartData.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No booking data for this period</div>
      ) :
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#C6C6C6" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #E8E8E8', fontSize: 12 }}
            labelStyle={{ color: '#1A2E22', fontWeight: 500 }}
          />
          <Line
            type="monotone"
            dataKey="bookings"
            stroke="#006648"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#006648' }}
            name="Booking starts"
          />
        </LineChart>
      </ResponsiveContainer>}
    </div>
  )
}
