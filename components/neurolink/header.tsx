"use client"
import { motion } from "framer-motion"
import { Activity } from "lucide-react"

interface HeaderProps {
  onStartSession: () => void
  sessionState: "idle" | "calibrating" | "running" | "finished"
}

export default function Header({ onStartSession, sessionState }: HeaderProps) {
  const getButtonText = () => {
    switch (sessionState) {
      case "idle":
        return "Start Calibration"
      case "calibrating":
        return "Calibrating..."
      case "running":
        return "Session Running"
      case "finished":
        return "Restart"
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <motion.div className="flex items-center gap-3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="p-2 bg-neuro-blue/10 rounded-lg border border-neuro-blue/30">
            <Activity className="w-6 h-6 text-neuro-blue" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neuro-text tracking-tight">NeuroLink Bio-Feedback</h1>
            <p className="text-xs text-neuro-muted">Real-time Biometric Analysis</p>
          </div>
        </motion.div>

        <div className="flex items-center gap-4">
          <motion.div
            className="flex items-center gap-2"
            animate={{ opacity: sessionState !== "idle" ? 1 : 0.7 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className={`w-2 h-2 rounded-full ${sessionState === "running" ? "bg-neuro-green animate-pulse" : "bg-gray-400"}`}
            />
            <span className="text-xs font-mono text-neuro-text">
              {sessionState === "running" ? "CONNECTED" : "STANDBY"}
            </span>
          </motion.div>

          <motion.button
            onClick={onStartSession}
            disabled={sessionState === "calibrating" || sessionState === "running"}
            className="px-6 py-2 bg-gradient-to-r from-neuro-blue to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-neuro-blue/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 text-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {getButtonText()}
          </motion.button>
        </div>
      </div>
    </header>
  )
}
