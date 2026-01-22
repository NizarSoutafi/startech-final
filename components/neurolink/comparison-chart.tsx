"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function ComparisonChart({ dataA, dataB, nameA, nameB }: any) {
  
  // Fusion des données pour le graphique
  // On prend la durée la plus longue
  const length = Math.max(dataA.length, dataB.length)
  const chartData = []

  for (let i = 0; i < length; i++) {
    chartData.push({
      time: i,
      // Session A (Bleu)
      engA: dataA[i] ? dataA[i].engagement_val : null,
      // Session B (Orange)
      engB: dataB[i] ? dataB[i].engagement_val : null,
    })
  }

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis dataKey="time" stroke="#888" tick={{fontSize: 12}} tickFormatter={(val) => `${val}s`} />
          <YAxis stroke="#888" tick={{fontSize: 12}} domain={[0, 100]} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', color: '#fff' }}
            labelFormatter={(label) => `Temps : ${label}s`}
          />
          <Legend />
          
          {/* Ligne A (Bleu) */}
          <Line 
            type="monotone" 
            dataKey="engA" 
            name={nameA} 
            stroke="#3b82f6" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 6 }} 
          />
          
          {/* Ligne B (Orange) */}
          <Line 
            type="monotone" 
            dataKey="engB" 
            name={nameB} 
            stroke="#f97316" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 6 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}