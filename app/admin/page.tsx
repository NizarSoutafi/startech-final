"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, RefreshCcw, ArrowLeft, Clock, User, Fingerprint, Activity, BarChart3 } from "lucide-react"
import Link from "next/link"
// On importe les graphiques (assurez-vous d'avoir recharts installé)
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

// --- CONFIGURATION API ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function AdminDashboard() {
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [measurements, setMeasurements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // 1. Charger la liste
  useEffect(() => { fetchSessions() }, [])

  const fetchSessions = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/sessions`)
      const data = await res.json()
      setSessions(data || [])
    } catch (e) { console.error(e) } finally { setIsLoading(false) }
  }

  // 2. Charger détails
  const handleSelectSession = async (sessionId: number) => {
    setLoadingDetails(true)
    setSelectedSession(null)
    try {
      const res = await fetch(`${API_URL}/api/sessions/${sessionId}`)
      const data = await res.json()
      setSelectedSession(data.info)
      setMeasurements(data.data || [])
    } catch (e) { console.error(e) } finally { setLoadingDetails(false) }
  }

  // 3. Supprimer
  const handleDelete = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation()
    if (!confirm("Supprimer définitivement ?")) return
    try {
      await fetch(`${API_URL}/api/sessions/${sessionId}`, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (selectedSession?.id === sessionId) { setSelectedSession(null); setMeasurements([]) }
    } catch (e) { alert("Erreur suppression") }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  // Calcul des moyennes pour les cartes du haut
  const avgEngagement = measurements.length ? Math.round(measurements.reduce((acc, curr) => acc + curr.engagement_val, 0) / measurements.length) : 0
  const avgSatisfaction = measurements.length ? Math.round(measurements.reduce((acc, curr) => acc + curr.satisfaction_val, 0) / measurements.length) : 0

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      {/* HEADER */}
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            STARTECH <span className="text-green-600">ADMIN</span>
          </h1>
          <p className="text-slate-500">Analyse comportementale & Biométrie</p>
        </div>
        <div className="flex gap-4">
          <Link href="/"><Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" /> Retour Dashboard</Button></Link>
          <Button onClick={fetchSessions} className="bg-slate-900 text-white hover:bg-slate-800 gap-2"><RefreshCcw className="w-4 h-4" /> Actualiser</Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SIDEBAR LISTE */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white h-[calc(100vh-12rem)] flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
                <Clock className="w-4 h-4" /> Sessions ({sessions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
              {isLoading ? <div className="p-8 text-center text-slate-400 text-xs">Chargement...</div> : (
                <div className="divide-y divide-slate-100">
                  {sessions.map((session) => (
                    <div key={session.id} onClick={() => handleSelectSession(session.id)} className={`p-4 cursor-pointer hover:bg-green-50/50 transition-all group ${selectedSession?.id === session.id ? "bg-green-50 border-l-4 border-green-500" : "border-l-4 border-transparent"}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-900 text-sm">{session.first_name} {session.last_name}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100" onClick={(e) => handleDelete(e, session.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                      <div className="text-[10px] text-slate-500 flex justify-between">
                        <span>{formatDate(session.created_at)}</span>
                        <Badge variant="secondary" className="text-[10px] py-0 h-4">{session.client_id}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* MAIN CONTENT */}
        <div className="lg:col-span-9 space-y-6">
          {selectedSession ? (
            <>
              {/* 1. CARTES RESUME */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500 uppercase">Durée Session</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-slate-900">{measurements.length > 0 ? measurements[measurements.length - 1].session_time : 0}s</div></CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500 uppercase">Engagement Moyen</CardTitle></CardHeader>
                    <CardContent><div className={`text-2xl font-bold ${avgEngagement > 60 ? "text-green-600" : "text-orange-500"}`}>{avgEngagement}%</div></CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500 uppercase">Satisfaction Moyenne</CardTitle></CardHeader>
                    <CardContent><div className={`text-2xl font-bold ${avgSatisfaction > 60 ? "text-green-600" : "text-orange-500"}`}>{avgSatisfaction}%</div></CardContent>
                </Card>
              </div>

              {/* 2. GRAPHIQUES (RESTITUTION) */}
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-green-600"/> Analyse Temporelle</CardTitle>
                  <CardDescription>Évolution des KPIs émotionnels seconde par seconde</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={measurements} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorSat" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="session_time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="engagement_val" name="Engagement" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorEng)" />
                      <Area type="monotone" dataKey="satisfaction_val" name="Satisfaction" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSat)" />
                      <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="3 3" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 3. TABLEAU DE DONNÉES (CORRIGÉ) */}
              <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-slate-500"/> Données Brutes</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-6 py-3 font-bold">Temps</th>
                        <th className="px-6 py-3 font-bold">Émotion</th>
                        <th className="px-6 py-3 font-bold text-center">Score IA</th>
                        <th className="px-6 py-3 font-bold">Engagement</th>
                        <th className="px-6 py-3 font-bold">Satisfaction</th>
                        <th className="px-6 py-3 font-bold">Confiance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {measurements.map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-mono font-bold text-slate-700">{m.session_time}s</td>
                          <td className="px-6 py-3">
                            <Badge variant="outline" className={`
                              ${m.emotion === 'happy' ? 'bg-green-100 text-green-800 border-green-200' : 
                                m.emotion === 'sad' || m.emotion === 'angry' || m.emotion === 'fear' ? 'bg-red-100 text-red-800 border-red-200' : 
                                'bg-slate-100 text-slate-800 border-slate-200'}
                            `}>
                              {m.emotion?.toUpperCase() || "N/A"}
                            </Badge>
                          </td>
                          <td className="px-6 py-3 text-center text-slate-500">
                            {m.emotion_score ? Math.round(m.emotion_score * 10) / 10 + '%' : '-'}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{Math.round(m.engagement_val)}%</span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{m.engagement_lbl}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{Math.round(m.satisfaction_val)}%</span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{m.satisfaction_lbl}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 font-bold text-slate-700">{Math.round(m.trust_val)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4"><User className="w-8 h-8 text-slate-300" /></div>
              <p className="text-lg font-medium">Sélectionnez une session</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}