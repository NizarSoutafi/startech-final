"use client"

import { useState, useEffect, useRef } from "react"
import MetricsPanel from "@/components/neurolink/metrics-panel"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Play, Square, RotateCcw, Zap, User, Fingerprint, Shield, Target } from "lucide-react"
import { io, Socket } from "socket.io-client"
import Link from "next/link"

interface MetricData { timestamp: number; value: number; engagement: number; satisfaction: number; trust: number; }
interface UserInfo { firstName: string; lastName: string; clientId: string }

export default function Dashboard() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [sessionTime, setSessionTime] = useState(0)
  const [formData, setFormData] = useState({ firstName: "", lastName: "", clientId: "" })
  const [currentMetrics, setCurrentMetrics] = useState({ engagement: 0, satisfaction: 50, trust: 50, loyalty: 50, opinion: 50, emotion: "neutral" })
  const [history, setHistory] = useState<MetricData[]>([])
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [faceCoords, setFaceCoords] = useState<any>(null)
  const [cameraActive, setCameraActive] = useState(false)

  // 1. Démarrer Webcam Locale
  useEffect(() => {
    if (userInfo && !cameraActive) {
      navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 } })
        .then(stream => { if (videoRef.current) { videoRef.current.srcObject = stream; setCameraActive(true) } })
        .catch(err => console.error("Erreur Webcam:", err))
    }
  }, [userInfo, cameraActive])

  // 2. Logique Socket & Envoi d'images
  useEffect(() => {
    if (!userInfo) return;
    const newSocket = io("http://localhost:8000")
    newSocket.on("connect", () => setIsConnected(true))
    newSocket.on("disconnect", () => setIsConnected(false))
    
    newSocket.on("metrics_update", (data: any) => {
      setSessionTime(data.session_time); setIsRecording(data.is_recording)
      setFaceCoords(data.face_coords)
      
      const newMetrics = { 
        emotion: data.emotion,
        engagement: data.metrics.engagement, satisfaction: data.metrics.satisfaction,
        trust: data.metrics.trust, loyalty: data.metrics.loyalty, opinion: data.metrics.opinion
      }
      setCurrentMetrics(newMetrics)
      
      if (data.is_recording) {
        setHistory(prev => [...prev.slice(-29), {
          timestamp: data.session_time, value: newMetrics.engagement, engagement: newMetrics.engagement,
          satisfaction: newMetrics.satisfaction, trust: newMetrics.trust
        }])
      }
    })

    setSocket(newSocket)

    // Envoi 5 fois par seconde
    const interval = setInterval(() => {
        if (videoRef.current && canvasRef.current && newSocket.connected) {
            const ctx = canvasRef.current.getContext('2d')
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, 480, 360)
                const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.5)
                newSocket.emit('process_frame', dataUrl)
            }
        }
    }, 200)

    return () => { clearInterval(interval); newSocket.close() }
  }, [userInfo])

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); if (formData.firstName && formData.lastName) setUserInfo(formData) }
  const handleStartStop = () => { if (socket && userInfo) { isRecording ? socket.emit("stop_session") : (sessionTime === 0 && setHistory([]), socket.emit("start_session", userInfo)) } }
  const handleReset = () => { if (socket) socket.emit("stop_session"); setHistory([]); setSessionTime(0); setCurrentMetrics(prev => ({ ...prev, engagement: 0, emotion: "neutral" })) }
  const handleLogout = () => { setUserInfo(null); setHistory([]); setSessionTime(0); setCameraActive(false); if(socket) socket.disconnect() }
  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
  const getEmotionDisplay = (e: string) => { const map: any = { happy: "😄 JOIE", sad: "😢 TRISTESSE", angry: "😠 COLÈRE", surprise: "😲 SURPRISE", fear: "😨 PEUR", neutral: "😐 NEUTRE" }; return map[e] || e.toUpperCase() }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden text-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-100 via-slate-50 to-white opacity-80"></div>
        <Card className="w-full max-w-md border-slate-200 bg-white shadow-2xl relative z-10">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-50 flex items-center justify-center border border-green-100 shadow-sm"><Fingerprint className="w-10 h-10 text-green-600" /></div>
            <div><CardTitle className="text-3xl font-bold tracking-tight text-slate-900">STARTECH <span className="text-green-600">ID</span></CardTitle><CardDescription className="text-slate-500">Identification biométrique du sujet</CardDescription></div>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="firstName" className="text-xs uppercase tracking-widest text-slate-500">Prénom</Label><Input id="firstName" placeholder="Ex: Jean" className="bg-slate-50 border-slate-200 text-slate-900 focus:border-green-500 h-11" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required /></div>
              <div className="space-y-2"><Label htmlFor="lastName" className="text-xs uppercase tracking-widest text-slate-500">Nom</Label><Input id="lastName" placeholder="Ex: Dupont" className="bg-slate-50 border-slate-200 text-slate-900 focus:border-green-500 h-11" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required /></div>
              <div className="space-y-2"><Label htmlFor="clientId" className="text-xs uppercase tracking-widest text-slate-500">Code Projet</Label><Input id="clientId" placeholder="Ex: PROJET-A12" className="bg-slate-50 border-slate-200 text-slate-900 focus:border-green-500 h-11" value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} /></div>
            </CardContent>
            <CardFooter><Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg font-bold shadow-lg shadow-green-200">INITIALISER SESSION</Button></CardFooter>
          </form>
        </Card>
        <div className="absolute bottom-6 right-6 z-20"><Link href="/admin"><Button variant="ghost" className="text-slate-500 hover:text-slate-900 hover:bg-slate-200 text-xs gap-2"><Shield className="w-3 h-3" /> Accès Admin</Button></Link></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="flex h-16 items-center px-6 justify-between">
           <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-slate-900"><div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_15px_#22c55e] animate-pulse" />STARTECH <span className="text-slate-400 font-normal">VISION</span></div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-xs font-bold text-white">{userInfo.firstName.charAt(0)}{userInfo.lastName.charAt(0)}</div>
                 <div className="flex flex-col"><span className="text-sm font-bold text-slate-900 leading-none">{userInfo.firstName} {userInfo.lastName}</span><span className="text-[10px] text-slate-500 leading-none mt-1">{userInfo.clientId || "ID: GUEST"}</span></div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs text-slate-500 hover:text-red-600 hover:bg-red-50">Sortir</Button>
           </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-hidden flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[600px]">
          <div className="lg:col-span-7 flex flex-col h-full">
            <Card className="border-slate-300 bg-white shadow-xl relative overflow-hidden transition-all duration-500 flex-1 flex flex-col group">
              <div className="absolute top-4 left-4 w-16 h-16 border-l-4 border-t-4 border-green-500 z-20 rounded-tl-lg opacity-80" />
              <div className="absolute top-4 right-4 w-16 h-16 border-r-4 border-t-4 border-green-500 z-20 rounded-tr-lg opacity-80" />
              <div className="absolute bottom-4 left-4 w-16 h-16 border-l-4 border-b-4 border-green-500 z-20 rounded-bl-lg opacity-80" />
              <div className="absolute bottom-4 right-4 w-16 h-16 border-r-4 border-b-4 border-green-500 z-20 rounded-br-lg opacity-80" />
              {isRecording && <div className="absolute inset-x-0 h-0.5 bg-green-500 shadow-[0_0_20px_#22c55e] z-10 animate-[scan_3s_ease-in-out_infinite]" style={{ top: '0%' }} />}
              {isRecording && <div className="absolute top-0 w-full h-1 bg-red-500 animate-pulse z-30" />}
              <CardContent className="p-0 flex-1 relative flex flex-col items-center justify-center bg-black overflow-hidden rounded-md m-1">
                <canvas ref={canvasRef} width="480" height="360" className="hidden" />
                <div className="absolute inset-0 w-full h-full relative">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    {faceCoords && (
                        <div className="absolute border-2 border-green-500 z-50 transition-all duration-100 ease-linear shadow-[0_0_15px_#22c55e]" style={{ left: `${(faceCoords.x / 480) * 100}%`, top: `${(faceCoords.y / 360) * 100}%`, width: `${(faceCoords.w / 480) * 100}%`, height: `${(faceCoords.h / 360) * 100}%`, transform: 'scaleX(-1)' }}>
                             <div className="absolute -top-6 left-0 bg-green-500 text-black text-[10px] font-bold px-1 scale-x-[-1]">TARGET LOCKED</div>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_4px,6px_100%] pointer-events-none" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-30"><Target className="w-64 h-64 text-white stroke-1" /></div>
                <div className="z-20 w-full px-8 pb-8 mt-auto absolute bottom-0">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                       <div className="flex items-center gap-2 mb-2"><Badge variant="outline" className={`px-3 py-1 border-none backdrop-blur-md ${isRecording ? "bg-red-600 text-white animate-pulse" : "bg-white/20 text-white"}`}><div className={`w-2 h-2 rounded-full mr-2 ${isRecording ? "bg-white" : "bg-slate-300"}`} />{isRecording ? "ENREGISTREMENT" : "PRÊT"}</Badge></div>
                       <div className="text-7xl font-mono font-bold text-white tabular-nums tracking-tighter drop-shadow-lg">{formatTime(sessionTime)}</div>
                    </div>
                    <div className="text-right">
                        <div className="bg-white/90 backdrop-blur-xl px-6 py-4 rounded-xl border border-white shadow-2xl">
                            <span className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Emotion Dominante</span>
                            <span className="text-3xl font-bold text-slate-900 flex items-center justify-end gap-3">{getEmotionDisplay(currentMetrics.emotion)}</span>
                        </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-8 pt-6 border-t border-white/20">
                    <Button size="icon" variant="outline" onClick={handleReset} className="h-14 w-14 rounded-full border border-white/20 bg-white/10 text-white hover:bg-white hover:text-black backdrop-blur-md transition-all"><RotateCcw className="h-5 w-5" /></Button>
                    {!isRecording ? (<Button onClick={handleStartStop} className="bg-green-600 hover:bg-green-500 text-white px-10 h-14 text-lg font-bold rounded-full shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-105"><Play className="mr-2 h-5 w-5 fill-current" /> DÉMARRER</Button>) : (<Button onClick={handleStartStop} variant="destructive" className="px-10 h-14 text-lg font-bold rounded-full shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all hover:scale-105"><Square className="mr-2 h-5 w-5 fill-current" /> STOP</Button>)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-5 flex flex-col h-full gap-4">
            <MetricsPanel metrics={currentMetrics} />
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex justify-between items-center text-xs font-mono text-slate-500 mt-auto">
               <div className="flex items-center gap-2"><Zap className={`w-3 h-3 ${isConnected ? "text-green-500" : "text-red-500"}`} />SERVEUR STARTECH</div>
               <span className={isConnected ? "text-green-600 font-bold bg-green-50 px-2 py-1 rounded" : "text-red-500 bg-red-50 px-2 py-1 rounded"}>{isConnected ? "ONLINE" : "OFFLINE"}</span>
            </div>
          </div>
        </div>
      </main>
      <style jsx global>{` @keyframes scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } } @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin-slow { animation: spin-slow 10s linear infinite; } `}</style>
    </div>
  )
}