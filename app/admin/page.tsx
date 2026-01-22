"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, Calendar, Database, FileText, Trash2, Clock, Activity, ThumbsUp, LogOut, ArrowRightLeft, Trophy } from "lucide-react"
import Link from "next/link"
import ComparisonChart from "@/components/neurolink/comparison-chart"

const CircularProgress = ({ value, color, label, icon: Icon }: any) => {
    const radius = 30; const circumference = 2 * Math.PI * radius; const offset = circumference - (value / 100) * circumference
    return (
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="relative flex items-center justify-center">
          <svg className="transform -rotate-90 w-24 h-24">
            <circle cx="48" cy="48" r={radius} stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
            <circle cx="48" cy="48" r={radius} stroke={color} strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col"><span className="text-lg font-bold text-slate-900">{value}%</span></div>
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-slate-500 uppercase tracking-wide">{Icon && <Icon className="w-3 h-3" />} {label}</div>
      </div>
    )
}

export default function AdminPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [isAuthorized, setIsAuthorized] = useState(false)
  const router = useRouter()
  const [isCompareMode, setIsCompareMode] = useState(false)
  const [sessionA, setSessionA] = useState<any>(null); const [dataA, setDataA] = useState<any[]>([]); const [statsA, setStatsA] = useState<any>(null)
  const [sessionB, setSessionB] = useState<any>(null); const [dataB, setDataB] = useState<any[]>([]); const [statsB, setStatsB] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem("startech_admin_token")
    if (token !== "authorized_access_granted") { router.push("/admin/login") } 
    else { setIsAuthorized(true); fetch('http://localhost:8000/api/sessions').then(res => res.json()).then(data => setSessions(data)) }
  }, [])

  const handleSelectSession = (sessionId: number) => {
    fetch(`http://localhost:8000/api/sessions/${sessionId}`).then(res => res.json()).then(response => {
        const info = response.info; const data = response.data; const stats = calculateStatsInternal(data)
        if (isCompareMode) {
            if (!sessionA) { setSessionA(info); setDataA(data); setStatsA(stats) } 
            else if (!sessionB && sessionId !== sessionA.id) { setSessionB(info); setDataB(data); setStatsB(stats) } 
            else if (sessionA && sessionB) { setSessionA(info); setDataA(data); setStatsA(stats); setSessionB(null); setDataB([]); setStatsB(null) }
        } else { setSessionA(info); setDataA(data); setStatsA(stats); setSessionB(null); setDataB([]); setStatsB(null) }
      })
  }

  const calculateStatsInternal = (data: any[]) => {
    if (data.length === 0) return null
    const avg = (key: string) => Math.round(data.reduce((acc, curr) => acc + curr[key], 0) / data.length)
    return { duration: data.length, avg_engagement: avg('engagement_val'), avg_satisfaction: avg('satisfaction_val'), dominant_label: data[data.length - 1]?.satisfaction_lbl || "N/A" }
  }
  const toggleCompareMode = () => { setIsCompareMode(!isCompareMode); setSessionB(null); setDataB([]); setStatsB(null) }
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation(); if (!confirm("Supprimer définitivement ?")) return
    const res = await fetch(`http://localhost:8000/api/sessions/${sessionId}`, { method: 'DELETE' })
    if (res.ok) { setSessions(prev => prev.filter(s => s.id !== sessionId)); if (sessionA?.id === sessionId) { setSessionA(null); setDataA([]); setStatsA(null) }; if (sessionB?.id === sessionId) { setSessionB(null); setDataB([]); setStatsB(null) } }
  }
  const handleExport = (session: any, data: any) => {
    if (!data.length) return
    const headers = ["Temps", "Emotion", "Score IA", "Engagement", "Label Engagement", "Satisfaction", "Label Satisfaction", "Confiance", "Fidelite", "Avis"]
    const rows = data.map((row: any) => [ String(row.session_time).replace('.', ','), row.emotion, row.emotion_score ? String(row.emotion_score.toFixed(2)).replace('.', ',') : "0", String(row.engagement_val), `"${row.engagement_lbl}"`, String(row.satisfaction_val), `"${row.satisfaction_lbl}"`, String(row.trust_val), String(row.loyalty_val), `"${row.opinion_lbl}"` ])
    const csvContent = [headers.join(";"), ...rows.map((e: any) => e.join(";"))].join("\n")
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", `Rapport_${session.first_name}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }
  
  // CORRECTION DE LA DATE ICI : On gère created_at de Supabase
  const formatDate = (dateStr: string) => {
      if (!dateStr) return "Date inconnue";
      try {
        return new Date(dateStr).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })
      } catch (e) { return "Erreur date" }
  }

  if (!isAuthorized) return null

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <header className="border-b border-slate-200 bg-white p-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
            <Link href="/"><Button variant="ghost" size="icon" className="text-slate-500 hover:text-blue-600 hover:bg-blue-50"><ArrowLeft className="w-5 h-5" /></Button></Link>
            <div><h1 className="text-xl font-bold flex items-center gap-2 text-slate-900"><Database className="w-5 h-5 text-blue-600" /> STARTECH <span className="text-slate-400">ADMIN</span></h1></div>
        </div>
        <div className="flex items-center gap-4">
            <Button onClick={toggleCompareMode} className={`gap-2 border transition-colors duration-200 ${isCompareMode ? "bg-purple-600 border-purple-600 text-white hover:bg-purple-700 hover:text-white" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"}`}><ArrowRightLeft className="w-4 h-4" /> {isCompareMode ? "Mode Comparaison Actif" : "Comparer deux sessions"}</Button>
            <Button variant="ghost" onClick={() => {localStorage.removeItem("startech_admin_token"); router.push("/admin/login")}} className="text-slate-500 hover:text-red-600 hover:bg-red-50 gap-2"><LogOut className="w-4 h-4" /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden grid grid-cols-12 h-[calc(100vh-64px)]">
        <div className="col-span-3 border-r border-slate-200 bg-white flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50"><h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Historique</h2></div>
            <ScrollArea className="flex-1 bg-white">
                <div className="flex flex-col">
                    {sessions.map((session) => {
                        const isA = sessionA?.id === session.id; const isB = sessionB?.id === session.id
                        let activeClass = "border-l-4 border-l-transparent"
                        if (isA) activeClass = "bg-blue-50 border-l-blue-500"; if (isB) activeClass = "bg-orange-50 border-l-orange-500"
                        return (
                            <div key={session.id} onClick={() => handleSelectSession(session.id)} className={`group flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-all ${activeClass}`}>
                                <div>
                                    <div className="font-bold flex items-center gap-2 text-slate-800">{session.first_name} {session.last_name} {isA && <Badge className="bg-blue-500 h-4 px-1 text-[9px]">A</Badge>} {isB && <Badge className="bg-orange-500 h-4 px-1 text-[9px]">B</Badge>}</div>
                                    {/* CORRECTION ICI : created_at au lieu de start_time */}
                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2"><Calendar className="w-3 h-3" /> {formatDate(session.created_at)}</div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100" onClick={(e) => handleDeleteSession(e, session.id)}><Trash2 className="w-4 h-4 hover:text-red-500" /></Button>
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>

        <div className="col-span-9 p-6 overflow-y-auto bg-slate-50">
            {!isCompareMode && sessionA && statsA && (
                <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
                     <div className="flex justify-between items-start">
                        <div><h2 className="text-3xl font-bold text-slate-900">{sessionA.first_name} {sessionA.last_name}</h2><p className="text-slate-500 flex items-center gap-2 mt-1"><Clock className="w-4 h-4" /> Durée: {statsA.duration}s | ID: {sessionA.client_id || "N/A"}</p></div>
                        <Button variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => handleExport(sessionA, dataA)}><FileText className="w-4 h-4 mr-2" /> CSV</Button>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                        <Card className="bg-white shadow-sm border-slate-200"><CardContent className="pt-6"><CircularProgress value={statsA.avg_engagement} color="#3b82f6" label="Engagement" icon={Activity} /></CardContent></Card>
                        <Card className="bg-white shadow-sm border-slate-200"><CardContent className="pt-6"><CircularProgress value={statsA.avg_satisfaction} color="#22c55e" label="Satisfaction" icon={ThumbsUp} /></CardContent></Card>
                        <Card className="flex items-center justify-center bg-slate-900 text-white shadow-sm border-slate-900"><div className="text-center"><Badge variant="outline" className="mb-2 text-slate-400 border-slate-700">Verdict</Badge><div className="text-xl font-bold">{statsA.dominant_label}</div></div></Card>
                    </div>
                    <Card className="bg-white shadow-sm border-slate-200"><CardHeader><CardTitle className="text-slate-900">Analyse Temporelle</CardTitle></CardHeader><CardContent><ComparisonChart dataA={dataA} dataB={[]} nameA={`${sessionA.first_name} (Engagement)`} nameB="" /></CardContent></Card>
                    <Card className="bg-white shadow-sm border-slate-200"><CardHeader><CardTitle className="text-slate-900">Données Brutes Complètes</CardTitle></CardHeader><CardContent><div className="rounded-md border border-slate-200 overflow-hidden"><ScrollArea className="h-[400px] w-full"><table className="w-full text-sm text-left text-slate-700"><thead className="bg-slate-100 font-medium sticky top-0 z-10 text-slate-900"><tr><th className="p-3">Temps</th><th className="p-3">Émotion</th><th className="p-3">Score IA</th><th className="p-3 border-l border-slate-200">Engagement</th><th className="p-3 border-l border-slate-200">Satisfaction</th><th className="p-3 border-l border-slate-200">Confiance</th><th className="p-3 border-l border-slate-200">Fidélité</th><th className="p-3 border-l border-slate-200">Avis</th></tr></thead><tbody className="divide-y divide-slate-100">{dataA.map((row, i) => (<tr key={i} className="hover:bg-slate-50 transition-colors"><td className="p-3 font-mono text-xs">{row.session_time}s</td><td className="p-3 capitalize flex items-center gap-2"><Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-700">{row.emotion}</Badge></td><td className="p-3 font-mono text-xs text-slate-500">{row.emotion_score?.toFixed(1)}%</td><td className="p-3 border-l border-slate-100"><div className="flex flex-col"><span className="font-bold text-xs">{row.engagement_val}%</span><span className="text-[10px] text-slate-400">{row.engagement_lbl}</span></div></td><td className="p-3 border-l border-slate-100"><div className="flex flex-col"><span className={`font-bold text-xs ${row.satisfaction_val > 50 ? "text-green-600" : "text-orange-500"}`}>{row.satisfaction_val}%</span><span className="text-[10px] text-slate-400">{row.satisfaction_lbl}</span></div></td><td className="p-3 border-l border-slate-100"><div className="flex flex-col"><span className="font-bold text-xs">{row.trust_val}%</span><span className="text-[10px] text-slate-400">{row.trust_lbl}</span></div></td><td className="p-3 border-l border-slate-100"><div className="flex flex-col"><span className="font-bold text-xs">{row.loyalty_val}%</span><span className="text-[10px] text-slate-400">{row.loyalty_lbl}</span></div></td><td className="p-3 border-l border-slate-100"><span className="text-xs">{row.opinion_lbl}</span></td></tr>))}</tbody></table></ScrollArea></div></CardContent></Card>
                </div>
            )}
            {isCompareMode && sessionA && sessionB && statsA && statsB && (
                 <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in zoom-in-95">
                    <div className="grid grid-cols-3 items-center text-center bg-white shadow-sm p-6 rounded-2xl border border-slate-200"><div className="text-blue-600"><div className="text-2xl font-bold">{sessionA.first_name}</div><div className="text-sm opacity-70">Session A</div></div><div className="flex justify-center"><div className="bg-slate-100 rounded-full px-4 py-1 text-xs font-bold text-slate-500 border border-slate-200">VS</div></div><div className="text-orange-500"><div className="text-2xl font-bold">{sessionB.first_name}</div><div className="text-sm opacity-70">Session B</div></div></div>
                    <Card className="border-slate-200 bg-white shadow-sm"><CardHeader><CardTitle className="text-slate-900">Duel d'Engagement</CardTitle></CardHeader><CardContent><ComparisonChart dataA={dataA} dataB={dataB} nameA={`Engagement ${sessionA.first_name}`} nameB={`Engagement ${sessionB.first_name}`} /></CardContent></Card>
                    <div className="grid grid-cols-2 gap-6"><Card className={`border-t-4 border-t-blue-500 shadow-sm bg-white ${statsA.avg_engagement > statsB.avg_engagement ? "bg-blue-50" : ""}`}><CardHeader><CardTitle className="flex justify-between text-slate-900">{sessionA.first_name}{statsA.avg_engagement > statsB.avg_engagement && <Badge className="bg-yellow-400 text-black gap-1 hover:bg-yellow-500"><Trophy className="w-3 h-3" /> Vainqueur</Badge>}</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-4"><CircularProgress value={statsA.avg_engagement} color="#3b82f6" label="Engagement" icon={Activity} /><CircularProgress value={statsA.avg_satisfaction} color="#3b82f6" label="Satisfaction" icon={ThumbsUp} /></CardContent></Card><Card className={`border-t-4 border-t-orange-500 shadow-sm bg-white ${statsB.avg_engagement > statsA.avg_engagement ? "bg-orange-50" : ""}`}><CardHeader><CardTitle className="flex justify-between text-slate-900">{sessionB.first_name}{statsB.avg_engagement > statsA.avg_engagement && <Badge className="bg-yellow-400 text-black gap-1 hover:bg-yellow-500"><Trophy className="w-3 h-3" /> Vainqueur</Badge>}</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-4"><CircularProgress value={statsB.avg_engagement} color="#f97316" label="Engagement" icon={Activity} /><CircularProgress value={statsB.avg_satisfaction} color="#f97316" label="Satisfaction" icon={ThumbsUp} /></CardContent></Card></div>
                 </div>
            )}
            {(!sessionA) && <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50"><ArrowLeft className="w-12 h-12 mb-4 animate-pulse" /><p>Sélectionnez une session à gauche pour commencer.</p></div>}
            {(isCompareMode && sessionA && !sessionB) && <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50"><div className="text-blue-600 font-bold mb-2">Session A : {sessionA.first_name} sélectionnée.</div><p>Maintenant, sélectionnez la Session B dans la liste.</p></div>}
        </div>
      </main>
    </div>
  )
}