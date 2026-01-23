"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, RefreshCcw, ArrowLeft, Clock, User, Fingerprint } from "lucide-react"
import Link from "next/link"

// --- CONFIGURATION API ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function AdminDashboard() {
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [measurements, setMeasurements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // 1. Charger la liste des sessions au démarrage
  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/sessions`)
      const data = await res.json()
      setSessions(data || [])
    } catch (e) {
      console.error("Erreur chargement:", e)
    } finally {
      setIsLoading(false)
    }
  }

  // 2. Charger les détails d'une session
  const handleSelectSession = async (sessionId: number) => {
    setLoadingDetails(true)
    setSelectedSession(null)
    try {
      const res = await fetch(`${API_URL}/api/sessions/${sessionId}`)
      const data = await res.json()
      setSelectedSession(data.info)
      setMeasurements(data.data || [])
    } catch (e) {
      console.error("Erreur détails:", e)
    } finally {
      setLoadingDetails(false)
    }
  }

  // 3. Supprimer une session
  const handleDelete = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation() // Empêche le clic de sélectionner la session
    if (!confirm("Voulez-vous vraiment supprimer cette session et toutes ses données ?")) return

    try {
      await fetch(`${API_URL}/api/sessions/${sessionId}`, { method: 'DELETE' })
      // On retire la session de la liste locale pour que ce soit instantané
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null)
        setMeasurements([])
      }
    } catch (e) {
      alert("Erreur lors de la suppression")
    }
  }

  // --- RENDU VISUEL ---
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      {/* HEADER */}
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            STARTECH <span className="text-green-600">ADMIN</span>
          </h1>
          <p className="text-slate-500">Supervision des sessions biométriques</p>
        </div>
        <div className="flex gap-4">
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Retour Dashboard
            </Button>
          </Link>
          <Button onClick={fetchSessions} variant="default" className="bg-slate-900 text-white hover:bg-slate-800 gap-2">
            <RefreshCcw className="w-4 h-4" /> Actualiser
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLONNE GAUCHE : LISTE DES SESSIONS */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white h-[calc(100vh-12rem)] flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" /> Historique ({sessions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
              {isLoading ? (
                <div className="p-8 text-center text-slate-400 animate-pulse">Chargement...</div>
              ) : sessions.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Aucune session enregistrée</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sessions.map((session) => (
                    <div 
                      key={session.id}
                      onClick={() => handleSelectSession(session.id)}
                      className={`p-4 cursor-pointer transition-all hover:bg-slate-50 relative group ${selectedSession?.id === session.id ? "bg-green-50 border-l-4 border-green-500" : "border-l-4 border-transparent"}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-slate-900">{session.first_name} {session.last_name}</span>
                        <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500">{formatDate(session.created_at)}</Badge>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <Fingerprint className="w-3 h-3" /> {session.client_id || "ID: N/A"}
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute right-2 bottom-2 h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDelete(e, session.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* COLONNE DROITE : DÉTAILS ET TABLEAU */}
        <div className="lg:col-span-8">
          {selectedSession ? (
            <div className="space-y-6">
              {/* CARTE INFO SESSION */}
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        <User className="w-6 h-6 text-green-600" />
                        {selectedSession.first_name} {selectedSession.last_name}
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-4">
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono text-slate-600">ID: {selectedSession.client_id}</span>
                        <span>Date: {formatDate(selectedSession.created_at)}</span>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                       <div className="text-3xl font-bold text-slate-900">{measurements.length}</div>
                       <div className="text-xs text-slate-500 uppercase tracking-wider">Points de mesure</div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* TABLEAU DES DONNÉES */}
              <Card className="border-slate-200 shadow-md bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
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
                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-3 font-mono font-bold text-slate-700">{m.session_time}s</td>
                          <td className="px-6 py-3">
                            <Badge variant="outline" className={`
                              ${m.emotion === 'happy' ? 'bg-green-100 text-green-800 border-green-200' : 
                                m.emotion === 'sad' || m.emotion === 'angry' || m.emotion === 'fear' ? 'bg-red-100 text-red-800 border-red-200' : 
                                'bg-slate-100 text-slate-800 border-slate-200'}
                            `}>
                              {m.emotion.toUpperCase()}
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
                          <td className="px-6 py-3">
                            <span className="font-bold text-slate-700">{Math.round(m.trust_val)}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : (
            /* PLACEHOLDER QUAND RIEN N'EST SÉLECTIONNÉ */
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-lg font-medium">Sélectionnez une session</p>
              <p className="text-sm">Cliquez sur un nom à gauche pour voir l'analyse.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}