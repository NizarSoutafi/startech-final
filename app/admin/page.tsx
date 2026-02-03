"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, RefreshCcw, ArrowLeft, User, Activity, BarChart3, Download, CheckSquare, Square, X, Lock, LogOut, FileText, Users, PieChart, Smile } from "lucide-react"
import Link from "next/link"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// --- CONFIGURATION ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gwjrwejdjpctizolfkcz.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3anJ3ZWpkanBjdGl6b2xma2N6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA5ODEyNCwiZXhwIjoyMDg0Njc0MTI0fQ.EjU1DGTN-jrdkaC6nJWilFtYZgtu-NKjnfiMVMnHal0"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export default function AdminDashboard() {
  // --- STATES AUTH ---
  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [authLoading, setAuthLoading] = useState(false)

  // --- STATES DASHBOARD ---
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [measurements, setMeasurements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // --- STATES MULTI-SELECTION ---
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [comparisonMode, setComparisonMode] = useState(false) 
  const [comparisonData, setComparisonData] = useState<any[]>([]) 
  const [groupDominantEmotion, setGroupDominantEmotion] = useState<string>("N/A") // AJOUT: State Emotion
  const [isComparing, setIsComparing] = useState(false)

  // 1. Vérifier la session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchSessions()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchSessions()
    })
    return () => subscription.unsubscribe()
  }, [])

  // --- AUTH ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true); setAuthError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError("Email ou mot de passe incorrect.")
    setAuthLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null); setSessions([]); setSelectedSession(null)
  }

  // --- API CALLS ---
  const fetchSessions = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/sessions`)
      const data = await res.json()
      setSessions(data || [])
      setSelectedIds([])
      setComparisonMode(false)
    } catch (e) { console.error(e) } finally { setIsLoading(false) }
  }

  const handleSelectSession = async (sessionId: number) => {
    setComparisonMode(false)
    setSelectedSession(null)
    try {
      const res = await fetch(`${API_URL}/api/sessions/${sessionId}`)
      const data = await res.json()
      setSelectedSession(data.info)
      setMeasurements(data.data || [])
    } catch (e) { console.error(e) }
  }

  // --- GESTION MULTI-SELECTION ---
  const toggleSelection = (e: React.MouseEvent, id: number) => {
      e.stopPropagation()
      if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(item => item !== id))
      else setSelectedIds(prev => [...prev, id])
  }

  const selectAll = () => {
      if (selectedIds.length === sessions.length) setSelectedIds([])
      else setSelectedIds(sessions.map(s => s.id))
  }

  const handleDelete = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation()
    if (!confirm("Supprimer définitivement ?")) return
    try {
      await fetch(`${API_URL}/api/sessions/${sessionId}`, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      setSelectedIds(prev => prev.filter(id => id !== sessionId))
      if (selectedSession?.id === sessionId) { setSelectedSession(null); setMeasurements([]) }
    } catch (e) { alert("Erreur suppression") }
  }

  const handleBulkDelete = async () => {
      if (!confirm(`Supprimer ces ${selectedIds.length} sessions ?`)) return
      setIsBulkDeleting(true)
      try {
          await Promise.all(selectedIds.map(id => fetch(`${API_URL}/api/sessions/${id}`, { method: 'DELETE' })))
          setSessions(prev => prev.filter(s => !selectedIds.includes(s.id)))
          setSelectedIds([])
          setSelectedSession(null)
      } catch (e) { alert("Erreur suppression masse") } finally { setIsBulkDeleting(false) }
  }

  // --- LOGIQUE DE COMPARAISON ---
  const handleCompare = async () => {
    if (selectedIds.length < 2) return
    setIsComparing(true)
    setComparisonMode(true)
    setComparisonData([])
    setSelectedSession(null)

    try {
      const promises = selectedIds.map(id => fetch(`${API_URL}/api/sessions/${id}`).then(res => res.json()))
      const results = await Promise.all(promises)

      // 1. Calcul Stats
      const stats = results.map((res: any) => {
        const measures = res.data || []
        const avgEng = measures.length ? measures.reduce((acc:any, curr:any) => acc + curr.engagement_val, 0) / measures.length : 0
        const avgSat = measures.length ? measures.reduce((acc:any, curr:any) => acc + curr.satisfaction_val, 0) / measures.length : 0
        const avgTrust = measures.length ? measures.reduce((acc:any, curr:any) => acc + curr.trust_val, 0) / measures.length : 0
        const avgLoyalty = measures.length ? measures.reduce((acc:any, curr:any) => acc + curr.loyalty_val, 0) / measures.length : 0
        
        return {
          name: `${res.info.first_name} ${res.info.last_name}`,
          id: res.info.id,
          engagement: Math.round(avgEng),   // Compréhension
          satisfaction: Math.round(avgSat),
          trust: Math.round(avgTrust),
          loyalty: Math.round(avgLoyalty),  // Crédibilité
          duration: measures.length
        }
      })

      // 2. Calcul Emotion Dominante (AJOUT)
      const emotionCounts: Record<string, number> = {}
      results.forEach((res: any) => {
          const measures = res.data || []
          measures.forEach((m: any) => {
              if (m.emotion) {
                  const emo = m.emotion.toLowerCase()
                  emotionCounts[emo] = (emotionCounts[emo] || 0) + 1
              }
          })
      })

      let maxEmo = "Neutre"
      let maxCount = 0
      Object.entries(emotionCounts).forEach(([emo, count]) => {
          if (count > maxCount) {
              maxCount = count
              maxEmo = emo
          }
      })
      
      const emotionMap: any = { 
          happy: "JOIE 😃", sad: "TRISTESSE 😢", angry: "COLÈRE 😡", 
          surprise: "SURPRISE 😲", fear: "PEUR 😨", neutral: "NEUTRE 😐", disgust: "DÉGOÛT 🤢" 
      }
      setGroupDominantEmotion(emotionMap[maxEmo] || maxEmo.toUpperCase())

      setComparisonData(stats)
    } catch (error) {
      console.error("Erreur comparaison", error)
    } finally {
      setIsComparing(false)
    }
  }

  // --- HELPERS AFFICHAGE ---
  const getAvisLabel = (val: number) => val > 60 ? "Avis Positif 👍" : (val < 40 ? "Avis Négatif 👎" : "Avis Neutre 😐")
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  const stripEmojis = (str: string) => str.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim()

  // Calculs pour Single View
  const avgEngagement = measurements.length ? Math.round(measurements.reduce((acc, curr) => acc + curr.engagement_val, 0) / measurements.length) : 0
  const avgSatisfaction = measurements.length ? Math.round(measurements.reduce((acc, curr) => acc + curr.satisfaction_val, 0) / measurements.length) : 0

  // Calculs pour Multi View
  const groupAvgEng = comparisonData.length ? Math.round(comparisonData.reduce((acc, curr) => acc + curr.engagement, 0) / comparisonData.length) : 0
  const groupAvgSat = comparisonData.length ? Math.round(comparisonData.reduce((acc, curr) => acc + curr.satisfaction, 0) / comparisonData.length) : 0

  // --- EXPORTS INDIVIDUELS ---
  const handleExportCSV = () => {
    if (!measurements.length || !selectedSession) return
    const separator = ";"
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    csvContent += `Temps${separator}Emotion${separator}Score IA${separator}Comprehension${separator}Label Comprehension${separator}Satisfaction${separator}Label Satisfaction${separator}Confiance${separator}Credibilite${separator}Avis Global\n`
    measurements.forEach((m) => {
        const score = m.emotion_score ? Number(m.emotion_score).toFixed(2).replace('.', ',') : '0,00'
        const avis = getAvisLabel(m.opinion_val)
        const row = [m.session_time, m.emotion, score, Math.round(m.engagement_val), m.engagement_lbl, Math.round(m.satisfaction_val), m.satisfaction_lbl, Math.round(m.trust_val), Math.round(m.loyalty_val), avis].join(separator)
        csvContent += row + "\n"
    })
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); const filename = `Rapport_${selectedSession.first_name}_${selectedSession.last_name}.csv`; link.setAttribute("download", filename); document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  const handleExportPDF = () => {
    if (!measurements.length || !selectedSession) return
    const doc = new jsPDF()
    doc.setFillColor(34, 197, 94); doc.rect(0, 0, 210, 24, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("STARTECH VISION", 14, 16)
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("RAPPORT D'ANALYSE BIOMÉTRIQUE", 200, 16, { align: "right" })
    doc.setTextColor(0, 0, 0); doc.setFontSize(10)
    doc.text(`Client : ${selectedSession.first_name} ${selectedSession.last_name}`, 14, 35)
    doc.text(`ID Projet : ${selectedSession.client_id || "N/A"}`, 14, 41)
    doc.text(`Date : ${formatDate(selectedSession.created_at)}`, 14, 47)
    doc.text(`Durée : ${measurements.length} secondes`, 14, 53)
    doc.setFillColor(245, 245, 245); doc.roundedRect(14, 60, 182, 25, 2, 2, 'F')
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("SYNTHÈSE DE LA SESSION", 105, 68, { align: "center" })
    doc.setFont("helvetica", "normal"); doc.setFontSize(10)
    const lastAvisClean = stripEmojis(measurements.length > 0 ? getAvisLabel(measurements[measurements.length - 1].opinion_val) : "N/A")
    doc.text(`Compréhension Moy. : ${avgEngagement}%`, 25, 78); doc.text(`Satisfaction Moy. : ${avgSatisfaction}%`, 90, 78); doc.text(`Tendance : ${lastAvisClean}`, 155, 78)
    const tableRows = measurements.map(m => [m.session_time, m.emotion?.toUpperCase(), m.emotion_score ? Number(m.emotion_score).toFixed(1) + '%' : '-', stripEmojis(m.engagement_lbl), stripEmojis(m.satisfaction_lbl), stripEmojis(getAvisLabel(m.opinion_val))])
    autoTable(doc, { head: [['T(s)', 'Emotion', 'Score', 'Compréh.', 'Satisfaction', 'Avis']], body: tableRows, startY: 95, theme: 'grid', headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold', halign: 'center' }, bodyStyles: { textColor: 50, halign: 'center' }, alternateRowStyles: { fillColor: [240, 253, 244] }, styles: { fontSize: 9, cellPadding: 3 } })
    const pageCount = doc.getNumberOfPages()
    for(let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150); doc.text(`Page ${i} sur ${pageCount} - Généré par Startech Vision AI - Confidentiel`, 105, 290, { align: 'center' }) }
    doc.save(`Rapport_${selectedSession.first_name}_${selectedSession.last_name}.pdf`)
  }

  // --- EXPORTS GROUPE (AVEC EMOTION DOMINANTE AJOUTÉE) ---
  const handleGroupExportCSV = () => {
    if (!comparisonData.length) return
    const separator = ";"
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"
    // AJOUT: Ligne Emotion Dominante
    csvContent += `EMOTION DOMINANTE DU GROUPE : ${stripEmojis(groupDominantEmotion)}\n\n`
    csvContent += `Nom${separator}Comprehension${separator}Satisfaction${separator}Credibilite${separator}Duree (s)\n`
    comparisonData.forEach((d) => {
        const row = [d.name, d.engagement, d.satisfaction, d.loyalty, d.duration].join(separator)
        csvContent += row + "\n"
    })
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); const filename = `Rapport_Groupe_Comparatif.csv`; link.setAttribute("download", filename); document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  const handleGroupExportPDF = () => {
    if (!comparisonData.length) return
    const doc = new jsPDF()
    // En-tête
    doc.setFillColor(34, 197, 94); doc.rect(0, 0, 210, 24, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("STARTECH VISION", 14, 16)
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("RAPPORT COMPARATIF GROUPE", 200, 16, { align: "right" })
    
    // Résumé
    doc.setTextColor(0, 0, 0); doc.setFontSize(10)
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 14, 35)
    doc.text(`Nombre de profils comparés : ${comparisonData.length}`, 14, 41)

    // Synthèse Moyenne & EMOTION (AJOUT)
    doc.setFillColor(245, 245, 245); doc.roundedRect(14, 50, 182, 25, 2, 2, 'F')
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("SYNTHÈSE DU GROUPE", 105, 58, { align: "center" })
    doc.setFont("helvetica", "normal"); doc.setFontSize(10)
    doc.text(`Compréhension : ${groupAvgEng}%`, 25, 68); doc.text(`Satisfaction : ${groupAvgSat}%`, 80, 68)
    
    // Ajout visuel Emotion
    doc.setFont("helvetica", "bold"); doc.setTextColor(22, 163, 74) 
    doc.text(`Émotion Dominante : ${stripEmojis(groupDominantEmotion)}`, 130, 68)
    doc.setTextColor(0, 0, 0)

    // Tableau Comparatif
    const tableRows = comparisonData.map(d => [d.name, d.engagement + '%', d.satisfaction + '%', d.loyalty + '%', d.duration + 's'])
    
    autoTable(doc, { 
        head: [['Nom', 'Compréhension', 'Satisfaction', 'Crédibilité', 'Durée']], 
        body: tableRows, 
        startY: 85, 
        theme: 'grid', 
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', halign: 'center' }, 
        bodyStyles: { textColor: 50, halign: 'center' }, 
        alternateRowStyles: { fillColor: [239, 246, 255] }, 
        styles: { fontSize: 10, cellPadding: 3 } 
    })

    // Footer
    const pageCount = doc.getNumberOfPages()
    for(let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150); doc.text(`Page ${i} sur ${pageCount} - Généré par Startech Vision AI`, 105, 290, { align: 'center' }) }
    doc.save(`Rapport_Groupe_Comparatif.pdf`)
  }

  // --- LOGIN VIEW ---
  if (!session) { return ( <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4"> <Card className="w-full max-w-sm shadow-xl"> <CardHeader className="text-center"> <Lock className="w-8 h-8 text-green-500 mx-auto mb-2" /> <CardTitle>Admin Login</CardTitle> </CardHeader> <form onSubmit={handleLogin}> <CardContent className="space-y-4"> <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div> <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div> {authError && <div className="text-red-500 text-sm text-center">{authError}</div>} </CardContent> <CardFooter><Button type="submit" className="w-full bg-green-600" disabled={authLoading}>Se connecter</Button></CardFooter> </form> </Card> </div> ) }

  // --- MAIN DASHBOARD ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div><h1 className="text-3xl font-bold tracking-tight">STARTECH <span className="text-green-600">ADMIN</span></h1><p className="text-slate-500">Supervision & Gestion de Masse</p></div>
        <div className="flex gap-4 items-center">
          <Link href="/"><Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" /> Dashboard</Button></Link>
          <Button onClick={fetchSessions} className="bg-slate-900 text-white gap-2"><RefreshCcw className="w-4 h-4" /> Actualiser</Button>
          <Button onClick={handleLogout} variant="destructive" size="icon"><LogOut className="w-4 h-4" /></Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SIDEBAR */}
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
                  <div className="flex gap-1">
                    {/* BOUTON COMPARER */}
                    {selectedIds.length > 1 && (
                      <Button size="sm" variant="default" onClick={handleCompare} className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white" title="Comparer les sessions sélectionnées">
                          <PieChart className="w-3 h-3 mr-1" /> Comparer
                      </Button>
                    )}
                    {selectedIds.length > 0 && (
                        <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={isBulkDeleting} className="h-7 text-xs px-2"><Trash2 className="w-3 h-3" /></Button>
                    )}
                  </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
              {isLoading ? <div className="p-8 text-center text-slate-400 text-xs">Chargement...</div> : (
                <div className="divide-y divide-slate-100">
                  {sessions.map((session) => (
                    <div key={session.id} onClick={() => handleSelectSession(session.id)} className={`p-4 cursor-pointer hover:bg-green-50/50 transition-all group relative ${selectedSession?.id === session.id ? "bg-green-50 border-l-4 border-green-500" : "border-l-4 border-transparent"}`}>
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

        {/* MAIN CONTENT AREA */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* VUE COMPARAISON (GROUPE) */}
          {comparisonMode && comparisonData.length > 0 ? (
             <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-blue-700">
                        <Users className="w-6 h-6" /> Analyse de Groupe ({comparisonData.length} profils)
                    </h2>
                    <div className="flex gap-2">
                        {/* BOUTONS EXPORT GROUPE */}
                        <Button size="sm" onClick={handleGroupExportPDF} className="bg-red-600 hover:bg-red-700 text-white gap-2 shadow-sm"><FileText className="w-4 h-4"/> PDF Groupe</Button>
                        <Button size="sm" onClick={handleGroupExportCSV} className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm"><Download className="w-4 h-4"/> CSV Groupe</Button>
                        <Button variant="outline" size="sm" onClick={() => setComparisonMode(false)}>Fermer</Button>
                    </div>
                </div>

                {/* KPIS GLOBAUX DU GROUPE + EMOTION DOMINANTE (AJOUT) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-blue-50 border-blue-100 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-xs text-blue-500 uppercase">Compréhension Moy.</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-blue-900">{groupAvgEng}%</div></CardContent></Card>
                    <Card className="bg-blue-50 border-blue-100 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-xs text-blue-500 uppercase">Satisfaction Moy.</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-blue-900">{groupAvgSat}%</div></CardContent></Card>
                    {/* CARTE EMOTION DOMINANTE */}
                    <Card className="bg-green-50 border-green-100 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-xs text-green-600 uppercase flex items-center gap-1"><Smile className="w-3 h-3"/> Émotion Groupe</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-green-800 break-words leading-tight">{groupDominantEmotion}</div></CardContent></Card>
                    <Card className="bg-white border-slate-200 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500 uppercase">Profils Analysés</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-slate-900">{comparisonData.length}</div></CardContent></Card>
                </div>

                {/* GRAPHIQUE COMPARATIF */}
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2">Comparatif des Performances</CardTitle></CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis domain={[0, 100]} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                                <Legend />
                                <Bar dataKey="engagement" name="Compréhension" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="satisfaction" name="Satisfaction" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* TABLEAU RÉCAPITULATIF */}
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader><CardTitle className="text-sm uppercase text-slate-500">Détails par profil</CardTitle></CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Nom</th>
                                    <th className="px-4 py-3">Compréhension</th>
                                    <th className="px-4 py-3">Satisfaction</th>
                                    <th className="px-4 py-3">Crédibilité</th>
                                    <th className="px-4 py-3">Durée</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {comparisonData.map((d, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-bold text-slate-700">{d.name}</td>
                                        <td className="px-4 py-3 font-bold text-green-600">{d.engagement}%</td>
                                        <td className="px-4 py-3 font-bold text-blue-600">{d.satisfaction}%</td>
                                        <td className="px-4 py-3 text-slate-600">{d.loyalty}%</td>
                                        <td className="px-4 py-3 text-slate-400">{d.duration}s</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
             </div>
          ) : selectedSession ? (
            /* VUE INDIVIDUELLE */
            <>
              {/* Labels Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-slate-200 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500 uppercase">Durée</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-slate-900">{measurements.length > 0 ? measurements[measurements.length - 1].session_time : 0}s</div></CardContent></Card>
                <Card className="bg-white border-slate-200 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500 uppercase">Compréhension Moy.</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${avgEngagement > 60 ? "text-green-600" : "text-orange-500"}`}>{avgEngagement}%</div></CardContent></Card>
                <Card className="bg-white border-slate-200 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500 uppercase">Satisfaction Moy.</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${avgSatisfaction > 60 ? "text-green-600" : "text-orange-500"}`}>{avgSatisfaction}%</div></CardContent></Card>
              </div>

              {/* Chart */}
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-green-600"/> Analyse Temporelle</CardTitle></CardHeader>
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
                      <Area type="monotone" dataKey="engagement_val" name="Compréhension" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorEng)" />
                      <Area type="monotone" dataKey="satisfaction_val" name="Satisfaction" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSat)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Table */}
              <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 flex flex-row justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-slate-500"/> Données Détaillées</CardTitle>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleExportPDF} className="bg-red-600 hover:bg-red-700 text-white gap-2 shadow-lg"><FileText className="w-4 h-4"/> Export PDF</Button>
                        <Button size="sm" onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg"><Download className="w-4 h-4"/> Export CSV</Button>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 font-bold whitespace-nowrap">Temps</th>
                        <th className="px-4 py-3 font-bold whitespace-nowrap">Emotion</th>
                        <th className="px-4 py-3 font-bold whitespace-nowrap">Score IA</th>
                        <th className="px-4 py-3 font-bold whitespace-nowrap text-green-700">Compréhension</th>
                        <th className="px-4 py-3 font-bold whitespace-nowrap">Label Compr.</th>
                        <th className="px-4 py-3 font-bold whitespace-nowrap">Satisfaction</th>
                        <th className="px-4 py-3 font-bold whitespace-nowrap">Label Satisf.</th>
                        <th className="px-4 py-3 font-bold whitespace-nowrap">Confiance</th>
                        <th className="px-4 py-3 font-bold whitespace-nowrap bg-green-50/50">Crédibilité</th>
                        <th className="px-4 py-3 font-bold whitespace-nowrap bg-blue-50/50">Avis Global</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {measurements.map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-700">{m.session_time}s</td>
                          <td className="px-4 py-3"><Badge variant="outline">{m.emotion?.toUpperCase()}</Badge></td>
                          <td className="px-4 py-3 text-slate-500">{m.emotion_score ? Number(m.emotion_score).toFixed(2).replace('.', ',') : '-'}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{Math.round(m.engagement_val)}%</td>
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{m.engagement_lbl}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{Math.round(m.satisfaction_val)}%</td>
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{m.satisfaction_lbl}</td>
                          <td className="px-4 py-3 font-bold text-slate-700">{Math.round(m.trust_val)}%</td>
                          <td className="px-4 py-3 font-bold text-green-700 bg-green-50/30">{Math.round(m.loyalty_val)}%</td>
                          <td className="px-4 py-3 font-bold text-blue-700 bg-blue-50/30 text-xs whitespace-nowrap">{getAvisLabel(m.opinion_val)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            /* VUE VIDE */
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4"><User className="w-8 h-8 text-slate-300" /></div>
              <p className="text-lg font-medium">Sélectionnez une session ou cochez-en plusieurs pour comparer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}