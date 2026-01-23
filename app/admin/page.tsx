"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, RefreshCcw, ArrowLeft, Clock, User, Activity, BarChart3, Download, CheckSquare, Square, X } from "lucide-react"
import Link from "next/link"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

// --- CONFIGURATION API ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function AdminDashboard() {
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [measurements, setMeasurements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  
  // --- NOUVEAU : GESTION SÉLECTION MULTIPLE ---
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  useEffect(() => { fetchSessions() }, [])

  const fetchSessions = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/sessions`)
      const data = await res.json()
      setSessions(data || [])
      setSelectedIds([]) // On remet à zéro la sélection après actualisation
    } catch (e) { console.error(e) } finally { setIsLoading(false) }
  }

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

  // Suppression Unitaire
  const handleDelete = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation()
    if (!confirm("Supprimer définitivement ?")) return
    try {
      await fetch(`${API_URL}/api/sessions/${sessionId}`, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      setSelectedIds(prev => prev.filter(id => id !== sessionId)) // On retire de la sélection si présent
      if (selectedSession?.id === sessionId) { setSelectedSession(null); setMeasurements([]) }
    } catch (e) { alert("Erreur suppression") }
  }

  // --- NOUVEAU : LOGIQUE DE SÉLECTION ---
  const toggleSelection = (e: React.MouseEvent, id: number) => {
      e.stopPropagation()
      if (selectedIds.includes(id)) {
          setSelectedIds(prev => prev.filter(item => item !== id))
      } else {
          setSelectedIds(prev => [...prev, id])
      }
  }

  const selectAll = () => {
      if (selectedIds.length === sessions.length) {
          setSelectedIds([]) // Tout décocher
      } else {
          setSelectedIds(sessions.map(s => s.id)) // Tout cocher
      }
  }

  // --- NOUVEAU : SUPPRESSION DE MASSE ---
  const handleBulkDelete = async () => {
      if (!confirm(`Voulez-vous vraiment supprimer ces ${selectedIds.length} sessions ? Cette action est irréversible.`)) return
      
      setIsBulkDeleting(true)
      try {
          // On envoie toutes les requêtes de suppression en parallèle
          await Promise.all(selectedIds.map(id => 
              fetch(`${API_URL}/api/sessions/${id}`, { method: 'DELETE' })
          ))
          
          // Mise à jour de l'interface
          setSessions(prev => prev.filter(s => !selectedIds.includes(s.id)))
          
          // Si la session active faisait partie de la suppression, on la ferme
          if (selectedSession && selectedIds.includes(selectedSession.id)) {
              setSelectedSession(null)
              setMeasurements([])
          }
          
          setSelectedIds([]) // Reset sélection
      } catch (e) {
          alert("Erreur lors de la suppression de masse")
      } finally {
          setIsBulkDeleting(false)
      }
  }

  // --- EXPORT CSV (Code Excel-FR compatible) ---
  const handleExportCSV = () => {
    if (!measurements.length || !selectedSession) return
    const separator = ";"
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    csvContent += `Temps (s)${separator}Emotion${separator}Score IA${separator}Engagement${separator}Satisfaction${separator}Confiance${separator}Fidelite${separator}Avis Global\n`

    measurements.forEach((m) => {
        const score = m.emotion_score ? m.emotion_score.toString().replace('.', ',') : '0'
        const row = [
            m.session_time, m.emotion, score,
            Math.round(m.engagement_val), Math.round(m.satisfaction_val), Math.round(m.trust_val),
            Math.round(m.loyalty_val), Math.round(m.opinion_val)
        ].join(separator)
        csvContent += row + "\n"
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    const filename = `Rapport_${selectedSession.first_name}_${selectedSession.last_name}_${new Date().toISOString().slice(0,10)}.csv`
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const avgEngagement = measurements.length ? Math.round(measurements.reduce((acc, curr) => acc + curr.engagement_val, 0) / measurements.length) : 0
  const avgSatisfaction = measurements.length ? Math.round(measurements.reduce((acc, curr) => acc + curr.satisfaction_val, 0) / measurements.length) : 0

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            STARTECH <span className="text-green-600">ADMIN</span>
          </h1>
          <p className="text-slate-500">Supervision & Gestion de Masse</p>
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
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={selectAll}>
                          {selectedIds.length === sessions.length && sessions.length > 0 ? <CheckSquare className="w-4 h-4 text-green-600"/> : <Square className="w-4 h-4 text-slate-400"/>}
                      </Button>
                      <span className="text-xs font-bold text-slate-500 uppercase">{selectedIds.length} Sél.</span>
                  </div>
                  {selectedIds.length > 0 && (
                      <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={isBulkDeleting} className="h-7 text-xs px-2">
                          {isBulkDeleting ? "..." : <Trash2 className="w-3 h-3" />}
                      </Button>
                  )}
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
              {isLoading ? <div className="p-8 text-center text-slate-400 text-xs">Chargement...</div> : (
                <div className="divide-y divide-slate-100">
                  {sessions.map((session) => (
                    <div key={session.id} onClick={() => handleSelectSession(session.id)} className={`p-4 cursor-pointer hover:bg-green-50/50 transition-all group relative ${selectedSession?.id === session.id ? "bg-green-50 border-l-4 border-green-500" : "border-l-4 border-transparent"}`}>
                      {/* Checkbox de sélection */}
                      <div className="absolute left-2 top-4 z-10" onClick={(e) => toggleSelection(e, session.id)}>
                          {selectedIds.includes(session.id) ? <CheckSquare className="w-4 h-4 text-green-600 fill-green-100"/> : <Square className="w-4 h-4 text-slate-300 hover:text-slate-500"/>}
                      </div>
                      
                      <div className="pl-6">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-900 text-sm truncate w-24">{session.first_name} {session.last_name}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100" onClick={(e) => handleDelete(e, session.id)}><X className="w-3 h-3" /></Button>
                          </div>
                          <div className="text-[10px] text-slate-500 flex justify-between items-center">
                            <span>{formatDate(session.created_at)}</span>
                            <Badge variant="secondary" className="text-[9px] py-0 h-4 px-1">{session.client_id}</Badge>
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* MAIN CONTENT (UNCHANGED) */}
        <div className="lg:col-span-9 space-y-6">
          {selectedSession ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-slate-200 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500 uppercase">Durée</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-slate-900">{measurements.length > 0 ? measurements[measurements.length - 1].session_time : 0}s</div></CardContent></Card>
                <Card className="bg-white border-slate-200 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500 uppercase">Engagement</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${avgEngagement > 60 ? "text-green-600" : "text-orange-500"}`}>{avgEngagement}%</div></CardContent></Card>
                <Card className="bg-white border-slate-200 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500 uppercase">Satisfaction</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${avgSatisfaction > 60 ? "text-green-600" : "text-orange-500"}`}>{avgSatisfaction}%</div></CardContent></Card>
              </div>

              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-green-600"/> Analyse Temporelle</CardTitle>
                  <CardDescription>Évolution des émotions</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={measurements} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorSat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                      </defs>
                      <XAxis dataKey="session_time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="engagement_val" name="Engagement" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorEng)" />
                      <Area type="monotone" dataKey="satisfaction_val" name="Satisfaction" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSat)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 flex flex-row justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-slate-500"/> Données Détaillées</CardTitle>
                    <Button size="sm" onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg"><Download className="w-4 h-4"/> Export CSV</Button>
                </CardHeader>
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 font-bold">Temps</th>
                        <th className="px-4 py-3 font-bold">Émotion</th>
                        <th className="px-4 py-3 font-bold text-center">Score IA</th>
                        <th className="px-4 py-3 font-bold">Engagement</th>
                        <th className="px-4 py-3 font-bold">Satisfaction</th>
                        <th className="px-4 py-3 font-bold">Confiance</th>
                        <th className="px-4 py-3 font-bold bg-green-50/50">Fidélité</th>
                        <th className="px-4 py-3 font-bold bg-blue-50/50">Avis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {measurements.map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-700">{m.session_time}s</td>
                          <td className="px-4 py-3"><Badge variant="outline">{m.emotion?.toUpperCase()}</Badge></td>
                          <td className="px-4 py-3 text-center text-slate-500">{m.emotion_score ? Math.round(m.emotion_score * 10) / 10 + '%' : '-'}</td>
                          <td className="px-4 py-3"><div className="flex flex-col"><span className="font-bold">{Math.round(m.engagement_val)}%</span><span className="text-[10px] text-slate-400">{m.engagement_lbl}</span></div></td>
                          <td className="px-4 py-3"><div className="flex flex-col"><span className="font-bold">{Math.round(m.satisfaction_val)}%</span><span className="text-[10px] text-slate-400">{m.satisfaction_lbl}</span></div></td>
                          <td className="px-4 py-3 font-bold text-slate-700">{Math.round(m.trust_val)}%</td>
                          <td className="px-4 py-3 font-bold text-green-700 bg-green-50/30">{Math.round(m.loyalty_val)}%</td>
                          <td className="px-4 py-3 font-bold text-blue-700 bg-blue-50/30">{Math.round(m.opinion_val)}%</td>
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