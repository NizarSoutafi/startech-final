"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, RefreshCcw, ArrowLeft, User, Activity, LogOut, Search, Menu, X, CheckSquare, Square } from "lucide-react"
import Link from "next/link"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// --- CONFIGURATION ---
// On utilise les variables d'environnement pour que ce soit dynamique
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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
  const [searchTerm, setSearchTerm] = useState("")
  const [isTrashView, setIsTrashView] = useState(false)
  
  // --- STATE MOBILE (Le Menu Hamburger) ---
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const chartRef = useRef<HTMLDivElement>(null)

  // --- FORMULES ---
  const calculateConviction = (engagement: number, satisfaction: number) => {
      if (satisfaction < 45) return engagement * 0.1
      return (engagement * 0.4) + (satisfaction * 0.6)
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour:'2-digit', minute:'2-digit' })

  // --- AUTH & LOAD ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); if (session) fetchSessions(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session); if (session) fetchSessions(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthLoading(true); setAuthError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError("Erreur d'identification."); setAuthLoading(false)
  }
  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); }

  const fetchSessions = async (fetchTrash = isTrashView) => {
    setIsLoading(true)
    try {
      const endpoint = fetchTrash ? '/api/trash' : '/api/sessions'
      const res = await fetch(`${API_URL}${endpoint}`)
      const data = await res.json()
      setSessions(data || []); setSelectedSession(null)
    } catch (e) { console.error(e) } finally { setIsLoading(false) }
  }

  const handleSelectSession = async (sessionId: number) => {
    // Sur mobile, quand on clique, on ferme le menu pour voir le résultat
    setShowMobileMenu(false) 
    try {
      const res = await fetch(`${API_URL}/api/sessions/${sessionId}`)
      const data = await res.json()
      setSelectedSession(data.info); setMeasurements(data.data || [])
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation(); if (!confirm("Corbeille ?")) return
    try { await fetch(`${API_URL}/api/sessions/${sessionId}`, { method: 'DELETE' }); setSessions(prev => prev.filter(s => s.id !== sessionId)) } catch (e) { alert("Erreur") }
  }

  const filteredSessions = sessions.filter(session => {
      const term = searchTerm.toLowerCase()
      return `${session.first_name} ${session.last_name}`.toLowerCase().includes(term)
  })

  // Calculs Moyennes
  const avgEngagement = measurements.length ? Math.round(measurements.reduce((acc, curr) => acc + curr.engagement_val, 0) / measurements.length) : 0
  const avgSatisfaction = measurements.length ? Math.round(measurements.reduce((acc, curr) => acc + curr.satisfaction_val, 0) / measurements.length) : 0
  const avgConviction = Math.round(calculateConviction(avgEngagement, avgSatisfaction))


  // --- LOGIN SCREEN ---
  if (!session) return ( 
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6"> 
      <Card className="w-full max-w-sm shadow-xl border-t-4 border-green-600"> 
        <CardHeader><CardTitle className="text-center text-xl">Accès Démo Mobile</CardTitle></CardHeader> 
        <form onSubmit={handleLogin}> 
          <CardContent className="space-y-4"> 
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 text-lg"/></div> 
            <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 text-lg"/></div> 
            {authError && <div className="text-red-500 text-sm text-center">{authError}</div>} 
          </CardContent> 
          <div className="p-4"><Button type="submit" className="w-full bg-green-600 h-12 text-lg" disabled={authLoading}>Se connecter</Button></div> 
        </form> 
      </Card> 
    </div> 
  )

  // --- DASHBOARD MOBILE ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      
      {/* HEADER FIXE */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 flex justify-between items-center shadow-sm h-16">
        <div className="flex items-center gap-3">
            {/* Bouton Hamburger Mobile */}
            <Button variant="ghost" size="icon" onClick={() => setShowMobileMenu(!showMobileMenu)}>
                {showMobileMenu ? <X className="w-6 h-6 text-slate-900"/> : <Menu className="w-6 h-6 text-slate-900" />}
            </Button>
            <div>
                <h1 className="text-lg font-bold tracking-tight leading-none">STARTECH <span className="text-green-600">DEMO</span></h1>
            </div>
        </div>
        <Button onClick={handleLogout} size="icon" variant="destructive" className="h-9 w-9 rounded-full"><LogOut className="w-4 h-4" /></Button>
      </header>

      <div className="max-w-7xl mx-auto p-3 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* SIDEBAR / MENU MOBILE (Superposé) */}
        <div className={`
            fixed inset-0 z-20 bg-black/60 backdrop-blur-sm transition-opacity duration-200 lg:static lg:bg-transparent lg:block lg:col-span-3
            ${showMobileMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto'}
        `} onClick={() => setShowMobileMenu(false)}>
          
          <div className={`
              bg-white h-full w-4/5 max-w-xs shadow-2xl flex flex-col transition-transform duration-300 lg:w-auto lg:h-[calc(100vh-8rem)] lg:translate-x-0 lg:shadow-sm lg:rounded-xl lg:border
              ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}
          `} onClick={(e) => e.stopPropagation()}>
            
            <div className="p-4 border-b bg-slate-50 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">LISTE DES TESTS</span>
                    <Badge variant={isTrashView ? "destructive" : "outline"} onClick={() => { setIsTrashView(!isTrashView); fetchSessions(!isTrashView); }}>
                        {isTrashView ? "Corbeille" : "Actifs"}
                    </Badge>
                </div>
                <Input placeholder="Rechercher un nom..." className="bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {isLoading ? <div className="p-8 text-center text-slate-400">Chargement...</div> : (
                    <div className="divide-y divide-slate-100">
                        {filteredSessions.map((s) => (
                            <div key={s.id} onClick={() => handleSelectSession(s.id)} className={`p-4 active:bg-green-100 ${selectedSession?.id === s.id ? "bg-green-50 border-l-4 border-green-500" : ""}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-slate-900">{s.first_name} {s.last_name}</div>
                                        <div className="text-xs text-slate-500 mt-1">{formatDate(s.created_at)}</div>
                                    </div>
                                    {!isTrashView && <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={(e) => handleDelete(e, s.id)}><Trash2 className="w-4 h-4" /></Button>}
                                </div>
                            </div>
                        ))}
                        {filteredSessions.length === 0 && <div className="p-8 text-center text-slate-400 italic">Aucun test trouvé</div>}
                    </div>
                )}
            </div>
          </div>
        </div>

        {/* CONTENU PRINCIPAL */}
        <div className="lg:col-span-9 space-y-4">
          {selectedSession ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
              
              {/* CARTES KPIS - GROSSES POUR LE DOIGT */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="shadow-sm border-green-100 bg-green-50/50">
                    <CardHeader className="p-3 pb-1"><CardTitle className="text-xs text-green-700 uppercase">Compréhension</CardTitle></CardHeader>
                    <CardContent className="p-3 pt-0"><div className="text-3xl font-bold text-green-700">{avgEngagement}%</div></CardContent>
                </Card>
                <Card className="shadow-sm border-blue-100 bg-blue-50/50">
                    <CardHeader className="p-3 pb-1"><CardTitle className="text-xs text-blue-700 uppercase">Satisfaction</CardTitle></CardHeader>
                    <CardContent className="p-3 pt-0"><div className="text-3xl font-bold text-blue-700">{avgSatisfaction}%</div></CardContent>
                </Card>
                <Card className="shadow-sm border-orange-100 bg-orange-50/50">
                    <CardHeader className="p-3 pb-1"><CardTitle className="text-xs text-orange-700 uppercase">Conviction</CardTitle></CardHeader>
                    <CardContent className="p-3 pt-0"><div className="text-3xl font-bold text-orange-700">{avgConviction}%</div></CardContent>
                </Card>
                <Card className="shadow-sm border-slate-100 bg-white">
                    <CardHeader className="p-3 pb-1"><CardTitle className="text-xs text-slate-500 uppercase">Durée</CardTitle></CardHeader>
                    <CardContent className="p-3 pt-0"><div className="text-3xl font-bold text-slate-700">{measurements.length > 0 ? measurements[measurements.length - 1].session_time : 0}s</div></CardContent>
                </Card>
              </div>

              {/* GRAPHIQUE - HAUTEUR FIXE POUR MOBILE */}
              <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
                <CardHeader className="p-3 border-b bg-slate-50/50">
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-green-600"/> Évolution en Temps Réel</CardTitle>
                </CardHeader>
                <div className="p-1 h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={measurements} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
                            <linearGradient id="colorSat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                        </defs>
                        <XAxis dataKey="session_time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="engagement_val" name="Compréhension" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorEng)" />
                        <Area type="monotone" dataKey="satisfaction_val" name="Satisfaction" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSat)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
              </Card>

              {/* TABLEAU DONNÉES */}
              <Card className="border-slate-200 shadow-sm mb-8">
                <CardHeader className="p-3 border-b">
                    <CardTitle className="text-sm font-bold">Détails (Seconde par Seconde)</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto max-h-[300px]">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 sticky top-0">
                            <tr>
                                <th className="px-3 py-2">Sec</th>
                                <th className="px-3 py-2">Émotion</th>
                                <th className="px-3 py-2 text-green-700">Compr.</th>
                                <th className="px-3 py-2 text-blue-700">Satis.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {measurements.map((m, i) => (
                                <tr key={i}>
                                    <td className="px-3 py-3 font-mono text-slate-500">{m.session_time}s</td>
                                    <td className="px-3 py-3 font-medium uppercase">{m.emotion}</td>
                                    <td className="px-3 py-3 font-bold text-green-600">{Math.round(m.engagement_val)}%</td>
                                    <td className="px-3 py-3 font-bold text-blue-600">{Math.round(m.satisfaction_val)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              </Card>

            </div>
          ) : (
            <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 mx-4 lg:mx-0">
              <User className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-center px-4">Aucune session sélectionnée</p>
              <Button className="mt-4 lg:hidden bg-slate-900" onClick={() => setShowMobileMenu(true)}>
                <Menu className="w-4 h-4 mr-2"/> Ouvrir la liste
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}