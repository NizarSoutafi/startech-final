"use client"
import { motion } from "framer-motion"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface BiometricData {
  engagement: number
  satisfaction: number
  trust: number
  loyalty: number
  opinion: number
  bpm: number
  timestamp: number
}

interface EmotionalIntensityChartProps {
  data: BiometricData[]
}

export default function EmotionalIntensityChart({ data }: EmotionalIntensityChartProps) {
  const chartData = data.map((d, idx) => ({
    time: idx,
    intensity: (d.engagement + d.satisfaction + d.opinion) / 3,
  }))

  return (
    <motion.div
      className="bg-white rounded-xl border border-gray-200 p-6 shadow-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-neuro-text tracking-wide">Emotional Intensity</h3>
        <p className="text-xs text-neuro-muted mt-1">Last 30 seconds</p>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="rgba(107, 114, 128, 0.5)"
              tick={{ fontSize: 12 }}
              style={{ fontSize: "12px" }}
            />
            <YAxis
              domain={[0, 100]}
              stroke="rgba(107, 114, 128, 0.5)"
              tick={{ fontSize: 12 }}
              style={{ fontSize: "12px" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid rgba(37, 99, 235, 0.3)",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#2563eb" }}
              formatter={(value: any) => value.toFixed(1)}
            />
            <Line
              type="monotone"
              dataKey="intensity"
              stroke="#2563eb"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-neuro-muted font-mono text-sm">Waiting for data...</p>
        </div>
      )}
    </motion.div>
  )
}
