"use client"
import { motion } from "framer-motion"

interface MetricGaugeProps {
  label: string
  value: number
  minLabel: string
  maxLabel: string
  color: string
  type: "engagement" | "valence" | "trust" | "loyalty" | "opinion"
}

export default function MetricGauge({ label, value, minLabel, maxLabel, color, type }: MetricGaugeProps) {
  const displayLabel =
    type === "valence"
      ? value < 40
        ? minLabel
        : value > 60
          ? maxLabel
          : "Neutral"
      : type === "trust" || type === "loyalty" || type === "opinion"
        ? value < 50
          ? minLabel
          : maxLabel
        : label

  return (
    <motion.div
      className="bg-white rounded-xl border border-gray-200 p-4 shadow-md"
      whileHover={{ borderColor: "rgba(37, 99, 235, 0.3)" }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-mono text-neuro-muted uppercase tracking-wider">{label}</span>
          <span className="text-sm font-mono font-bold text-neuro-text">{value.toFixed(0)}%</span>
        </div>
        <p className="text-xs text-neuro-blue">{displayLabel}</p>
      </div>

      {/* Gauge Bar Container */}
      <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
        {/* Background gradient segments for valence */}
        {type === "valence" && (
          <>
            <div className="absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-neuro-red to-transparent" />
            <div className="absolute inset-y-0 left-2/5 w-1/5 bg-gray-300" />
            <div className="absolute inset-y-0 right-0 w-2/5 bg-gradient-to-l from-neuro-green to-transparent" />
          </>
        )}

        {/* Fill bar with gradient */}
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r ${color} shadow-md`}
          initial={{ width: "0%" }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            filter: "drop-shadow(0 0 4px rgba(37, 99, 235, 0.3))",
          }}
        />

        {/* Animated shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
      </div>

      {/* Label helpers */}
      <div className="flex justify-between mt-2">
        <span className="text-xs text-gray-500 font-mono">{minLabel}</span>
        <span className="text-xs text-gray-500 font-mono">{maxLabel}</span>
      </div>
    </motion.div>
  )
}
