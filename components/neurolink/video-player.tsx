"use client"
import { motion } from "framer-motion"
import { Play, Loader, Upload } from "lucide-react"

interface VideoPlayerProps {
  progress: number
  isRunning: boolean
  isCalibrating: boolean
  videoUrl?: string
  sessionState?: string // Added sessionState prop to fix undeclared variable error
}

export default function VideoPlayer({ progress, isRunning, isCalibrating, videoUrl, sessionState }: VideoPlayerProps) {
  return (
    <motion.div
      className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Video container */}
      <div className="aspect-video bg-black flex items-center justify-center relative overflow-hidden">
        {videoUrl ? (
          <video
            src={videoUrl}
            className="w-full h-full object-contain"
            controls={sessionState !== "running"}
            autoPlay={isRunning}
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(37,99,235,.05)_25%,rgba(37,99,235,.05)_50%,transparent_50%,transparent_75%,rgba(37,99,235,.05)_75%,rgba(37,99,235,.05))] bg-[length:40px_40px] animate-pulse" />

            {isCalibrating ? (
              <motion.div
                className="flex flex-col items-center gap-4 z-10"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              >
                <Loader className="w-12 h-12 text-neuro-blue animate-spin" />
                <p className="text-neuro-blue font-mono text-sm">Calibrating Sensors...</p>
              </motion.div>
            ) : isRunning ? (
              <div className="z-10">
                <Play className="w-16 h-16 text-neuro-blue/60" fill="currentColor" />
              </div>
            ) : (
              <div className="z-10 text-center">
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-400 font-mono text-sm">Select a video to begin</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <motion.div
          className="h-full bg-gradient-to-r from-neuro-blue to-blue-500"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Progress text */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <span className="text-xs font-mono text-neuro-muted">Progress</span>
        <span className="text-sm font-mono text-neuro-blue">{progress.toFixed(1)}%</span>
      </div>
    </motion.div>
  )
}
