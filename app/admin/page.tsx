"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, RefreshCcw, ArrowLeft, User, Activity, BarChart3, Download, CheckSquare, Square, X, Lock, LogOut, FileText, Users, PieChart, Smile, ShoppingCart, ShieldCheck, Search, Image as ImageIcon } from "lucide-react"
import Link from "next/link"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart as RePieChart, Pie, Cell } from 'recharts'
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toPng } from "html-to-image"

// --- CONFIGURATION ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gwjrwejdjpctizolfkcz.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3anJ3ZWpkanBjdGl6b2xma2N6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA5ODEyNCwiZXhwIjoyMDg0Njc0MTI0fQ.EjU1DGTN-jrdkaC6nJWilFtYZgtu-NKjnfiMVMnHal0"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Couleurs pour les émotions
const EMOTION_COLORS: any = {
  happy: "#22c55e",    // Vert
  surprise: "#eab308", // Jaune
  neutral: "#94a3b8",  // Gris
  sad: "#3b82f6",      // Bleu
  fear: "#a855f7",     // Violet
  angry: "#ef4444",    // Rouge
  disgust: "#10b981"   // Emeraude
}

const EMOTION_LABELS: any = {
  happy: "Joie", surprise: "Surprise", neutral: "Neutre",
  sad: "Tristesse", fear: "Peur", angry: "Colère", disgust: "Dégoût"
}

export default function AdminDashboard() {
  // --- STATES ---
  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [authLoading, setAuthLoading] = useState(false)

  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [measurements, setMeasurements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // --- STATES SEARCH & SELECTION ---
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [comparisonMode, setComparisonMode] = useState(false) 
  const [comparisonData, setComparisonData] = useState<any[]>([]) 
  const [groupDominantEmotion, setGroupDominantEmotion] = useState<string>("N/A")
  const [emotionDistribution, setEmotionDistribution] = useState<any[]>([])
  const [isComparing, setIsComparing] = useState(false)

  // NOUVEAU : Références pour capturer les images
  const chartRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // --- FORMULE CONVICTION ---
  const calculateConviction = (engagement: number, satisfaction: number) => {
      if (satisfaction < 45) return engagement * 0.1
      return (engagement * 0.4) + (satisfaction * 0.6)
  }

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

  // --- GESTION MULTI-SELECTION & FILTRE ---
  const filteredSessions = sessions.filter(session => {
      const fullName = `${session.first_name} ${session.last_name}`.toLowerCase()
      const clientId = (session.client_id || "").toLowerCase()
      const term = searchTerm.toLowerCase()
      return fullName.includes(term) || clientId.includes(term)
  })

  const toggleSelection = (e: React.MouseEvent, id: number) => {
      e.stopPropagation()
      if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(item => item !== id))
      else setSelectedIds(prev => [...prev, id])
  }

  const selectAll = () => {
      if (selectedIds.length === filteredSessions.length) setSelectedIds([])
      else setSelectedIds(filteredSessions.map(s => s.id))
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

      const stats = results.map((res: any) => {
        const measures = res.data || []
        const avgEng = measures.length ? measures.reduce((acc:any, curr:any) => acc + curr.engagement_val, 0) / measures.length : 0
        const avgSat = measures.length ? measures.reduce((acc:any, curr:any) => acc + curr.satisfaction_val, 0) / measures.length : 0
        const avgTrust = measures.length ? measures.reduce((acc:any, curr:any) => acc + curr.trust_val, 0) / measures.length : 0
        const avgCred = measures.length ? measures.reduce((acc:any, curr:any) => acc + curr.loyalty_val, 0) / measures.length : 0
        const avgConviction = calculateConviction(avgEng, avgSat)

        return {
          name: `${res.info.first_name} ${res.info.last_name}`,
          id: res.info.id,
          engagement: Math.round(avgEng),   
          satisfaction: Math.round(avgSat),
          credibility: Math.round(avgCred), 
          conviction: Math.round(avgConviction),
          duration: measures.length
        }
      })

      const emotionCounts: Record<string, number> = {}
      let totalEmotions = 0
      results.forEach((res: any) => {
          const measures = res.data || []
          measures.forEach((m: any) => {
              if (m.emotion) {
                  const emo = m.emotion.toLowerCase()
                  emotionCounts[emo] = (emotionCounts[emo] || 0) + 1
                  totalEmotions++
              }
          })
      })

      const distributionData = Object.entries(emotionCounts).map(([key, count]) => ({
          name: EMOTION_LABELS[key] || key,
          value: count,
          percent: Math.round((count / totalEmotions) * 100),
          fill: EMOTION_COLORS[key] || "#000"
      })).sort((a, b) => b.value - a.value)

      setEmotionDistribution(distributionData)

      if (distributionData.length > 0) {
          setGroupDominantEmotion(distributionData[0].name.toUpperCase())
      } else {
          setGroupDominantEmotion("N/A")
      }

      setComparisonData(stats)
    } catch (error) {
      console.error("Erreur comparaison", error)
    } finally {
      setIsComparing(false)
    }
  }

  // --- HELPERS ---
  const getAvisLabel = (val: number) => val > 60 ? "Avis Positif 👍" : (val < 40 ? "Avis Négatif 👎" : "Avis Neutre 😐")
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  const stripEmojis = (str: string) => str.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim()

  const avgEngagement = measurements.length ? Math.round(measurements.reduce((acc, curr) => acc + curr.engagement_val, 0) / measurements.length) : 0
  const avgSatisfaction = measurements.length ? Math.round(measurements.reduce((acc, curr) => acc + curr.satisfaction_val, 0) / measurements.length) : 0
  const avgCredibility = measurements.length ? Math.round(measurements.reduce((acc, curr) => acc + curr.loyalty_val, 0) / measurements.length) : 0
  const avgConviction = Math.round(calculateConviction(avgEngagement, avgSatisfaction))

  const groupAvgEng = comparisonData.length ? Math.round(comparisonData.reduce((acc, curr) => acc + curr.engagement, 0) / comparisonData.length) : 0
  const groupAvgSat = comparisonData.length ? Math.round(comparisonData.reduce((acc, curr) => acc + curr.satisfaction, 0) / comparisonData.length) : 0
  const groupAvgCred = comparisonData.length ? Math.round(comparisonData.reduce((acc, curr) => acc + curr.credibility, 0) / comparisonData.length) : 0
  const groupAvgConv = comparisonData.length ? Math.round(comparisonData.reduce((acc, curr) => acc + curr.conviction, 0) / comparisonData.length) : 0

  // --- EXPORTS IMAGES (PNG) AVEC HTML-TO-IMAGE ---
  const handleExportChartImage = async () => {
    if (!chartRef.current) return
    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: "#ffffff", pixelRatio: 2 })
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = `Analyse_Temporelle_${selectedSession?.first_name || 'Export'}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error("Erreur lors de l'export de l'image du graphique :", err)
      alert("Erreur lors de la création de l'image.")
    }
  }

  const handleExportTableImage = async () => {
    if (!tableRef.current) return
    try {
      // 1. Sauvegarder les styles actuels pour pouvoir les remettre
      const originalMaxHeight = tableRef.current.style.maxHeight
      const originalOverflow = tableRef.current.style.overflow

      // 2. Enlever les limites pour afficher le tableau en entier (permet la capture)
      tableRef.current.style.maxHeight = 'none'
      tableRef.current.style.overflow = 'visible'

      // Petit temps de pause pour laisser React/navigateur dessiner la grande table
      await new Promise(resolve => setTimeout(resolve, 100))

      // 3. Prendre la photo
      const dataUrl = await toPng(tableRef.current, { backgroundColor: "#ffffff", pixelRatio: 2 })
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = `Donnees_Detaillees_${selectedSession?.first_name || 'Export'}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 4. Remettre le tableau normal (avec le scroll limitant)
      tableRef.current.style.maxHeight = originalMaxHeight
      tableRef.current.style.overflow = originalOverflow

    } catch (err) {
      console.error("Erreur lors de l'export de l'image du tableau :", err)
      alert("Erreur lors de la création de l'image.")
    }
  }

  // --- EXPORTS CSV ---
  const handleExportCSV = () => {
    if (!measurements.length || !selectedSession) return
    const separator = ";"
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    csvContent += `Temps${separator}Emotion${separator}Score IA${separator}Intention de Compréhension${separator}Satisfaction${separator}Credibilite${separator}Conviction${separator}Avis Global\n`
    measurements.forEach((m) => {
        const conv = Math.round(calculateConviction(m.engagement_val, m.satisfaction_val))
        const row = [m.session_time, m.emotion, m.emotion_score, Math.round(m.engagement_val), Math.round(m.satisfaction_val), Math.round(m.loyalty_val), conv, getAvisLabel(m.opinion_val)].join(separator)
        csvContent += row + "\n"
    })
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); const filename = `Rapport_${selectedSession.first_name}.csv`; link.setAttribute("download", filename); document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  const handleGroupExportCSV = () => {
    if (!comparisonData.length) return
    const separator = ";"
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"
    csvContent += `EMOTION DOMINANTE : ${stripEmojis(groupDominantEmotion)}\n`
    csvContent += `MOYENNE CONVICTION : ${groupAvgConv}%\n`
    csvContent += `MOYENNE CREDIBILITE : ${groupAvgCred}%\n\n`
    
    csvContent += `REPARTITION EMOTIONNELLE\nEmotion${separator}Pourcentage\n`
    emotionDistribution.forEach(e => { csvContent += `${e.name}${separator}${e.percent}%\n` })
    csvContent += "\n"

    csvContent += `DETAILS PROFILS\nNom${separator}Intention de Compréhension${separator}Satisfaction${separator}Credibilite${separator}Conviction${separator}Duree (s)\n`
    comparisonData.forEach((d) => {
        const row = [d.name, d.engagement, d.satisfaction, d.credibility, d.conviction, d.duration].join(separator)
        csvContent += row + "\n"
    })
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); const filename = `Rapport_Groupe_Complet.csv`; link.setAttribute("download", filename); document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  // --- EXPORTS PDF ---
  const handleExportPDF = () => {
    if (!measurements.length || !selectedSession) return
    const doc = new jsPDF()
    doc.setFillColor(34, 197, 94); doc.rect(0, 0, 210, 24, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("STARTECH VISION", 14, 16)
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("ANALYSE INDIVIDUELLE", 200, 16, { align: "right" })
    doc.setTextColor(0, 0, 0); doc.setFontSize(10)
    doc.text(`Client : ${selectedSession.first_name} ${selectedSession.last_name}`, 14, 35)
    doc.text(`Date : ${formatDate(selectedSession.created_at)}`, 14, 41)
    
    doc.setFillColor(245, 245, 245); doc.roundedRect(14, 50, 182, 30, 2, 2, 'F')
    doc.setFont("helvetica", "bold"); doc.text("SYNTHÈSE", 105, 58, { align: "center" })
    doc.setFont("helvetica", "normal")
    doc.text(`Intention de Compréhension : ${avgEngagement}%`, 25, 68); doc.text(`Satisfaction : ${avgSatisfaction}%`, 115, 68) // Ajustement positionnement
    
    doc.setTextColor(147, 51, 234); 
    doc.text(`Crédibilité : ${avgCredibility}%`, 25, 74) // Ajustement positionnement
    doc.setTextColor(220, 38, 38); 
    doc.text(`Conviction : ${avgConviction}%`, 115, 74) // Ajustement positionnement
    doc.setTextColor(0, 0, 0)

    autoTable(doc, { 
        head: [['T(s)', 'Emotion', 'Int. Compr.', 'Satis.', 'Crédib.', 'Convict.']], 
        body: measurements.map(m => [
            m.session_time, 
            m.emotion, 
            Math.round(m.engagement_val), 
            Math.round(m.satisfaction_val),
            Math.round(m.loyalty_val), 
            Math.round(calculateConviction(m.engagement_val, m.satisfaction_val))
        ]), 
        startY: 90,
        headStyles: { fillColor: [34, 197, 94] }
    })
    doc.save(`Rapport_${selectedSession.first_name}.pdf`)
  }

  const handleGroupExportPDF = () => {
    if (!comparisonData.length) return
    const doc = new jsPDF()
    doc.setFillColor(34, 197, 94); doc.rect(0, 0, 210, 24, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("STARTECH VISION", 14, 16)
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("ANALYSE DE GROUPE", 200, 16, { align: "right" })
    
    doc.setTextColor(0, 0, 0); doc.setFontSize(10)
    doc.text(`Nombre de profils : ${comparisonData.length}`, 14, 35)

    doc.setFillColor(245, 245, 245); doc.roundedRect(14, 45, 182, 35, 2, 2, 'F')
    doc.setFont("helvetica", "bold"); doc.text("SYNTHÈSE GLOBALE", 105, 53, { align: "center" })
    doc.setFont("helvetica", "normal")
    doc.text(`Intention de Compréhension : ${groupAvgEng}%`, 25, 63); doc.text(`Satisfaction : ${groupAvgSat}%`, 115, 63)
    
    doc.setFont("helvetica", "bold"); doc.setTextColor(22, 163, 74) 
    doc.text(`Dominante : ${stripEmojis(groupDominantEmotion)}`, 25, 70)
    doc.setTextColor(147, 51, 234); 
    doc.text(`Crédibilité : ${groupAvgCred}%`, 85, 70)
    doc.setTextColor(220, 38, 38); 
    doc.text(`Conviction : ${groupAvgConv}%`, 135, 70)
    doc.setTextColor(0, 0, 0)

    doc.setFontSize(11); doc.text("Répartition Émotionnelle", 14, 90)
    const emoRows = emotionDistribution.map(e => [e.name, e.percent + '%', e.value + ' occ.'])
    autoTable(doc, { 
        head: [['Emotion', 'Pourcentage', 'Volume']], body: emoRows, startY: 95, theme: 'striped',
        headStyles: { fillColor: [100, 116, 139] }
    })

    const finalY = (doc as any).lastAutoTable.finalY + 15
    doc.text("Détails par Profil", 14, finalY - 5)
    
    const tableRows = comparisonData.map(d => [d.name, d.engagement + '%', d.satisfaction + '%', d.credibility + '%', d.conviction + '%'])
    autoTable(doc, { 
        head: [['Nom', 'Intention de Compréhension', 'Satisfaction', 'Crédibilité', 'Conviction']], 
        body: tableRows, startY: finalY, theme: 'grid', 
        headStyles: { fillColor: [59, 130, 246] }
    })
    doc.save(`Rapport_Groupe_Complet.pdf`)
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
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 p-4 space-y-3">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={selectAll}>
                          {selectedIds.length === filteredSessions.length && filteredSessions.length > 0 ? <CheckSquare className="w-4 h-4 text-green-600"/> : <Square className="w-4 h-4 text-slate-400"/>}
                      </Button>
                      <span className="text-xs font-bold text-slate-500 uppercase">{selectedIds.length} Sél.</span>
                  </div>
                  <div className="flex gap-1">
                    {/* BOUTON COMPARER */}
                    {selectedIds.length > 1 && (
                      <Button size="sm" variant="default" onClick={handleCompare} className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white" title="Comparer">
                          <PieChart className="w-3 h-3 mr-1" /> Comparer
                      </Button>
                    )}
                    {selectedIds.length > 0 && (
                        <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={isBulkDeleting} className="h-7 text-xs px-2"><Trash2 className="w-3 h-3" /></Button>
                    )}
                  </div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Chercher nom, ID..." 
                    className="pl-8 h-9 text-xs bg-white border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
              {isLoading ? <div className="p-8 text-center text-slate-400 text-xs">Chargement...</div> : (
                <div className="divide-y divide-slate-100">
                  {filteredSessions.length > 0 ? (
                    filteredSessions.map((session) => (
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
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs italic">Aucun résultat</div>
                  )}
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
                        <Button size="sm" onClick={handleGroupExportPDF} className="bg-red-600 hover:bg-red-700 text-white gap-2 shadow-sm"><FileText className="w-4 h-4"/> PDF Groupe</Button>
                        <Button size="sm" onClick={handleGroupExportCSV} className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm"><Download className="w-4 h-4"/> CSV Groupe</Button>
                        <Button variant="outline" size="sm" onClick={() => setComparisonMode(false)}>Fermer</Button>
                    </div>
                </div>

                {/* KPIS GLOBAUX */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <Card className="bg-blue-50 border-blue-100 shadow-sm"><CardHeader className="pb-2 p-3"><CardTitle className="text-[10px] text-blue-500 uppercase">Intention de Compréhension</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className="text-2xl font-bold text-blue-900">{groupAvgEng}%</div></CardContent></Card>
                    <Card className="bg-blue-50 border-blue-100 shadow-sm"><CardHeader className="pb-2 p-3"><CardTitle className="text-[10px] text-blue-500 uppercase">Satisfaction</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className="text-2xl font-bold text-blue-900">{groupAvgSat}%</div></CardContent></Card>
                    <Card className="bg-purple-50 border-purple-100 shadow-sm"><CardHeader className="pb-2 p-3"><CardTitle className="text-[10px] text-purple-600 uppercase flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Crédibilité</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className="text-2xl font-bold text-purple-800">{groupAvgCred}%</div></CardContent></Card>
                    <Card className="bg-orange-50 border-orange-100 shadow-sm"><CardHeader className="pb-2 p-3"><CardTitle className="text-[10px] text-orange-600 uppercase flex items-center gap-1"><ShoppingCart className="w-3 h-3"/> Conviction</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className="text-2xl font-bold text-orange-800">{groupAvgConv}%</div></CardContent></Card>
                    <Card className="bg-green-50 border-green-100 shadow-sm"><CardHeader className="pb-2 p-3"><CardTitle className="text-[10px] text-green-600 uppercase flex items-center gap-1"><Smile className="w-3 h-3"/> Dominante</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className="text-lg font-bold text-green-800 truncate">{groupDominantEmotion}</div></CardContent></Card>
                </div>

                {/* SECTION ANALYSE EMOTIONNELLE DETAILLEE */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* CAMEMBERT */}
                    <Card className="lg:col-span-1 border-slate-200 shadow-sm bg-white">
                         <CardHeader><CardTitle className="text-sm uppercase text-slate-500">Répartition Émotionnelle</CardTitle></CardHeader>
                         <CardContent className="h-[250px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie data={emotionDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                                        {emotionDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                                    </Pie>
                                    <Tooltip />
                                </RePieChart>
                            </ResponsiveContainer>
                         </CardContent>
                    </Card>

                    {/* DETAILS POURCENTAGES */}
                    <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white">
                         <CardHeader><CardTitle className="text-sm uppercase text-slate-500">Détail des Emotions du Groupe</CardTitle></CardHeader>
                         <CardContent className="overflow-y-auto h-[250px]">
                            <div className="space-y-4">
                                {emotionDistribution.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></div>
                                            <span className="text-sm font-medium text-slate-700">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-4 w-1/2">
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full" style={{ width: `${item.percent}%`, backgroundColor: item.fill }}></div>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900 w-12 text-right">{item.percent}%</span>
                                        </div>
                                    </div>
                                ))}
                                {emotionDistribution.length === 0 && <p className="text-sm text-slate-400 italic">Aucune donnée émotionnelle disponible.</p>}
                            </div>
                         </CardContent>
                    </Card>
                </div>

                {/* GRAPHIQUE COMPARATIF */}
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2">Comparatif des Profils</CardTitle></CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis domain={[0, 100]} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                                <Legend />
                                <Bar dataKey="engagement" name="Intention de Compréhension" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="satisfaction" name="Satisfaction" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="credibility" name="Crédibilité" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="conviction" name="Conviction" fill="#f97316" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
             </div>
          ) : selectedSession ? (
            /* VUE INDIVIDUELLE */
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="bg-white border-slate-200 shadow-sm col-span-1"><CardHeader className="pb-2 p-3"><CardTitle className="text-[10px] text-slate-500 uppercase">Durée</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className="text-xl font-bold text-slate-900">{measurements.length > 0 ? measurements[measurements.length - 1].session_time : 0}s</div></CardContent></Card>
                <Card className="bg-white border-slate-200 shadow-sm col-span-1"><CardHeader className="pb-2 p-3"><CardTitle className="text-[10px] text-slate-500 uppercase">Intention de Compréhension</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className={`text-xl font-bold ${avgEngagement > 60 ? "text-green-600" : "text-orange-500"}`}>{avgEngagement}%</div></CardContent></Card>
                <Card className="bg-white border-slate-200 shadow-sm col-span-1"><CardHeader className="pb-2 p-3"><CardTitle className="text-[10px] text-slate-500 uppercase">Satisfaction</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className={`text-xl font-bold ${avgSatisfaction > 60 ? "text-green-600" : "text-orange-500"}`}>{avgSatisfaction}%</div></CardContent></Card>
                <Card className="bg-purple-50 border-purple-100 shadow-sm col-span-1"><CardHeader className="pb-2 p-3"><CardTitle className="text-[10px] text-purple-600 uppercase flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Crédibilité</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className="text-xl font-bold text-purple-700">{avgCredibility}%</div></CardContent></Card>
                <Card className="bg-orange-50 border-orange-100 shadow-sm col-span-1"><CardHeader className="pb-2 p-3"><CardTitle className="text-[10px] text-orange-600 uppercase flex items-center gap-1"><ShoppingCart className="w-3 h-3"/> Conviction</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className="text-xl font-bold text-orange-700">{avgConviction}%</div></CardContent></Card>
              </div>

              {/* GRAPHIQUE TEMPOREL */}
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-green-600"/> Analyse Temporelle</CardTitle>
                    <Button size="sm" onClick={handleExportChartImage} variant="outline" className="gap-2 shadow-sm text-slate-600"><ImageIcon className="w-4 h-4"/> Image PNG</Button>
                </CardHeader>
                <div ref={chartRef} className="bg-white p-2">
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
                        <Area type="monotone" dataKey="engagement_val" name="Intention de Compréhension" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorEng)" />
                        <Area type="monotone" dataKey="satisfaction_val" name="Satisfaction" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSat)" />
                        </AreaChart>
                    </ResponsiveContainer>
                    </CardContent>
                </div>
              </Card>

              {/* TABLEAU DETAILLE */}
              <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 flex flex-row justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-slate-500"/> Données Détaillées</CardTitle>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleExportTableImage} variant="outline" className="gap-2 shadow-sm text-slate-600 bg-white"><ImageIcon className="w-4 h-4"/> Image PNG</Button>
                        <Button size="sm" onClick={handleExportPDF} className="bg-red-600 hover:bg-red-700 text-white gap-2 shadow-lg"><FileText className="w-4 h-4"/> Export PDF</Button>
                        <Button size="sm" onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg"><Download className="w-4 h-4"/> Export CSV</Button>
                    </div>
                </CardHeader>
                <div className="bg-white p-2">
                    <div ref={tableRef} className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 font-bold whitespace-nowrap">Temps</th>
                            <th className="px-4 py-3 font-bold whitespace-nowrap">Emotion</th>
                            <th className="px-4 py-3 font-bold whitespace-nowrap">Score IA</th>
                            <th className="px-4 py-3 font-bold whitespace-nowrap text-green-700">Intention de Compréhension</th>
                            <th className="px-4 py-3 font-bold whitespace-nowrap">Satisfaction</th>
                            <th className="px-4 py-3 font-bold whitespace-nowrap text-purple-700">Crédibilité</th>
                            <th className="px-4 py-3 font-bold whitespace-nowrap text-orange-600">Conviction</th>
                            <th className="px-4 py-3 font-bold whitespace-nowrap bg-blue-50/50">Avis Global</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {measurements.map((m, i) => {
                            const conv = Math.round(calculateConviction(m.engagement_val, m.satisfaction_val))
                            return (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-slate-700">{m.session_time}s</td>
                            <td className="px-4 py-3"><Badge variant="outline">{m.emotion?.toUpperCase()}</Badge></td>
                            <td className="px-4 py-3 text-slate-500">{m.emotion_score ? Number(m.emotion_score).toFixed(2).replace('.', ',') : '-'}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{Math.round(m.engagement_val)}%</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{Math.round(m.satisfaction_val)}%</td>
                            <td className="px-4 py-3 font-bold text-purple-700 bg-purple-50/30">{Math.round(m.loyalty_val)}%</td>
                            <td className="px-4 py-3 font-bold text-orange-600 bg-orange-50/30">{conv}%</td>
                            <td className="px-4 py-3 font-bold text-blue-700 bg-blue-50/30 text-xs whitespace-nowrap">{getAvisLabel(m.opinion_val)}</td>
                            </tr>
                        )})}
                        </tbody>
                    </table>
                    </div>
                </div>
              </Card>
            </>
          ) : (
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