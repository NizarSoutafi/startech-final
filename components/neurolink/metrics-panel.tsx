"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Activity, Heart, Shield, ThumbsUp, Brain, ShoppingCart } from "lucide-react"

// On met à jour l'interface pour accepter 'conversion' et 'lbl_conv'
interface MetricsPanelProps {
  metrics: {
    engagement: number
    satisfaction: number
    trust: number
    loyalty: number
    opinion: number
    conversion?: number // Nouveau (Optionnel pour éviter crash si pas encore là)
    lbl_conv?: string   // Nouveau
    emotion?: string
  }
}

export default function MetricsPanel({ metrics }: MetricsPanelProps) {
  
  // Fonction pour la couleur du CTA
  const getCTAColor = (score: number) => {
    if (score >= 70) return "text-green-600"
    if (score >= 40) return "text-orange-500"
    return "text-red-500"
  }

  // Fonction pour la barre CTA
  const getCTABarColor = (score: number) => {
    if (score >= 70) return "bg-green-600"
    if (score >= 40) return "bg-orange-500"
    return "bg-red-500"
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      
      {/* 1. COMPREHENSION (Engagement) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compréhension</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(metrics.engagement)}%</div>
          <Progress value={metrics.engagement} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">Niveau d'attention cognitive</p>
        </CardContent>
      </Card>

      {/* 2. SATISFACTION */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
          <Heart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(metrics.satisfaction)}%</div>
          <Progress value={metrics.satisfaction} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">Valence émotionnelle positive</p>
        </CardContent>
      </Card>

      {/* 3. CRÉDIBILITÉ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Crédibilité</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(metrics.trust)}%</div>
          <Progress value={metrics.trust} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">Confiance envers le message</p>
        </CardContent>
      </Card>

      {/* 4. NOUVEAU : CALL TO ACTION (CONVERSION) */}
      <Card className="border-2 border-slate-200 bg-slate-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold text-slate-800 uppercase">Potentiel Achat</CardTitle>
          <ShoppingCart className={`h-5 w-5 ${getCTAColor(metrics.conversion || 0)}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-black ${getCTAColor(metrics.conversion || 0)}`}>
            {Math.round(metrics.conversion || 0)}%
          </div>
          {/* Barre de progression personnalisée */}
          <div className="h-2 w-full bg-slate-200 rounded-full mt-2 overflow-hidden">
             <div 
                className={`h-full transition-all duration-500 ${getCTABarColor(metrics.conversion || 0)}`} 
                style={{ width: `${metrics.conversion || 0}%` }} 
             />
          </div>
          <p className={`text-xs font-bold mt-2 uppercase ${getCTAColor(metrics.conversion || 0)}`}>
            {metrics.lbl_conv || "En attente"}
          </p>
        </CardContent>
      </Card>

    </div>
  )
}