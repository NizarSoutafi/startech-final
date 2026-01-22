"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, ThumbsUp, Shield, Heart, MessageSquare, Brain } from "lucide-react"
import { motion } from "framer-motion"

interface MetricsPanelProps {
  metrics: {
    // bpm: number  <-- SUPPRIMÉ
    emotion: string
    engagement: number
    satisfaction: number
    trust: number
    loyalty: number
    opinion: number
  }
}

export default function MetricsPanel({ metrics }: MetricsPanelProps) {
  
  // Fonction utilitaire pour la couleur
  const getColor = (val: number) => {
    if (val >= 75) return "text-green-600"
    if (val >= 50) return "text-blue-600"
    return "text-orange-500"
  }

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      
      {/* 1. ENGAGEMENT (Remplace le BPM en première position) */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Engagement
          </CardTitle>
          <Activity className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">
            {metrics.engagement}%
          </div>
          <p className="text-xs text-slate-500 mt-1">
             Intensité émotionnelle
          </p>
          {/* Barre de progression */}
          <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-500" 
              initial={{ width: 0 }} 
              animate={{ width: `${metrics.engagement}%` }} 
              transition={{ type: "spring", stiffness: 50 }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. SATISFACTION */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Satisfaction
          </CardTitle>
          <ThumbsUp className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getColor(metrics.satisfaction)}`}>
            {metrics.satisfaction}%
          </div>
          <p className="text-xs text-slate-500 mt-1">Valence positive</p>
          <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-green-500" 
              initial={{ width: 0 }} 
              animate={{ width: `${metrics.satisfaction}%` }} 
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. CONFIANCE */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Confiance
          </CardTitle>
          <Shield className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">
            {metrics.trust}%
          </div>
          <p className="text-xs text-slate-500 mt-1">Crédibilité perçue</p>
          <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
             <motion.div className="h-full bg-purple-500" animate={{ width: `${metrics.trust}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* 4. FIDÉLITÉ */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Fidélité
          </CardTitle>
          <Heart className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">
            {metrics.loyalty}%
          </div>
          <p className="text-xs text-slate-500 mt-1">Intention de retour</p>
          <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
             <motion.div className="h-full bg-red-500" animate={{ width: `${metrics.loyalty}%` }} />
          </div>
        </CardContent>
      </Card>
      
      {/* 5. SCORE AVIS (Large, prend 2 colonnes) */}
      <Card className="col-span-2 bg-slate-900 text-white border-slate-800 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Score d'Opinion Global
          </CardTitle>
          <Brain className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
              <div className="text-3xl font-bold text-white">
                {metrics.opinion}/100
              </div>
              <p className="text-xs text-slate-400 mt-1">Synthèse IA des signaux</p>
          </div>
          <div className="h-12 w-24 bg-white/10 rounded flex items-center justify-center">
              <span className="text-lg font-bold">
                  {metrics.opinion > 60 ? "POS" : (metrics.opinion < 40 ? "NEG" : "NEU")}
              </span>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}