"use client"

import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Video, Mic, StopCircle, Play, Loader2, Camera, User, Smile, Upload, Menu, X, Globe, ShieldCheck, Zap, Heart, Eye } from "lucide-react"

// URL du Backend (Hugging Face)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function DesktopMobileHybrid() {
  const [firstName, setFirstName] = useState("Invité")
  const [lastName, setLastName] = useState("")
  const [clientId, setClientId] = useState("AZ-130") // Code style "Mission"
  
  const [socket, setSocket] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [detectedEmotion, setDetectedEmotion] = useState<string>("NEUTRE")
  const [metrics, setMetrics] = useState({ engagement: 50, satisfaction: 50, loyalty: 50, conviction: 50 })
  const [sessionTime, setSessionTime] = useState("00:00")
  
  // Interface Logic
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // --- 1. SOCKET & INITIALIZATION ---
  useEffect(() => {
    const newSocket = io(API_URL, { transports: ["websocket"] })
    
    newSocket.on("connect", () => {
      console.log("🟢 SYSTEM ONLINE")
      setIsConnected(true)
    })

    newSocket.on("metrics_update", (data: any) => {
      setDetectedEmotion(data.emotion.toUpperCase())
      setMetrics({
        engagement: Math.round(data.metrics.engagement),
        satisfaction: Math.round(data.metrics.satisfaction),
        loyalty: Math.round(data.metrics.loyalty),
        conviction: Math.round((data.metrics.engagement * 0.4) + (data.metrics.satisfaction * 0.6))
      })
    })

    setSocket(newSocket)
    return () => { newSocket.close() }
  }, [])

  // --- 2. CAMERA HANDLING (Avec support Mobile Frontal) ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: false 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      alert("Erreur Caméra : Activez les permissions.")
    }
  }

  // --- 3. SESSION LOGIC ---
  const handleStart = () => {
    setIsRecording(true)
    startCamera()
    
    // Timer
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
        const diff = Math.floor((Date.now() - startTimeRef.current) / 1000)
        const mins = Math.floor(diff / 60).toString().padStart(2, '0')
        const secs = (diff % 60).toString().padStart(2, '0')
        setSessionTime(`${mins}:${secs}`)
    }, 1000)

    if (socket) {
      socket.emit("start_session", { firstName, lastName, clientId })
      intervalRef.current = setInterval(() => sendFrame(), 200)
    }
  }

  const handleStop = () => {
    setIsRecording(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    if (socket) socket.emit("stop_session")
    
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }
  }

  const sendFrame = () => {
    if (!videoRef.current || !canvasRef.current || !socket) return
    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    canvasRef.current.width = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight
    // Dessin Miroir
    ctx.translate(canvasRef.current.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)

    const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.6)
    socket.emit("process_frame", dataUrl)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files && e.target.files[0]) setUploadedFile(e.target.files[0])
  }

  // --- RENDER HELPERS ---
  const getEmotionColor = (emo: string) => {
      const map: any = { "JOIE": "text-green-500", "SURPRISE": "text-yellow-500", "NEUTRE": "text-slate-400", "TRISTESSE": "text-blue-500", "COLÈRE": "text-red-500" }
      return map[emo] || "text-slate-400"
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-green-900 overflow-x-hidden flex flex-col lg:flex-row">
      
      {/* --- 1. SIDEBAR (ADMIN STYLE) --- */}
      {/* Mobile: Header Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 z-50">
          <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-green-600 rounded flex items-center justify-center font-bold text-black">ST</div>
              <span className="font-bold tracking-wider">STARTECH</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowMobileMenu(!showMobileMenu)}>
              {showMobileMenu ? <X/> : <Menu/>}
          </Button>
      </div>

      {/* Sidebar Content (Desktop: Fixed Left / Mobile: Toggle) */}
      <aside className={`
          fixed inset-0 z-40 bg-slate-900/95 backdrop-blur-md transition-transform duration-300 border-r border-slate-800
          lg:static lg:translate-x-0 lg:w-64 lg:block
          ${showMobileMenu ? 'translate-x-0 pt-20' : '-translate-x-full lg:pt-0'}
      `}>
          <div className="p-6 h-full flex flex-col">
            <div className="hidden lg:flex items-center gap-3 mb-10">
                <div className="h-10 w-10 bg-green-600 rounded flex items-center justify-center font-bold text-black shadow-[0_0_15px_rgba(22,163,74,0.6)]">ST</div>
                <div>
                    <h1 className="font-bold text-lg tracking-wider text-white">STARTECH</h1>
                    <div className="text-[10px] text-green-500 tracking-[0.2em]">VISION</div>
                </div>
            </div>

            {/* User Info Block */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center"><User className="w-4 h-4"/></div>
                    <div>
                        <div className="font-bold text-sm text-white">NSNizar STF</div>
                        <div className="text-xs text-slate-500">Admin</div>
                    </div>
                </div>
                <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-slate-700">
                    <span className="text-slate-400">ID: {clientId}</span>
                    <Badge variant="outline" className="text-[10px] border-green-900 text-green-500 bg-green-900/10">ONLINE</Badge>
                </div>
            </div>

            {/* Menu Links */}
            <nav className="space-y-2 flex-1">
                <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"><Zap className="w-4 h-4 mr-3"/> Live Analyse</Button>
                <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => window.location.href = "/admin"}><ShieldCheck className="w-4 h-4 mr-3"/> Dashboard</Button>
                <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"><Globe className="w-4 h-4 mr-3"/> Historique</Button>
            </nav>

            <Button variant="destructive" className="w-full mt-auto bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50">
                SORTIR
            </Button>
          </div>
      </aside>

      {/* --- 2. MAIN CONTENT (THE HUD) --- */}
      <main className="flex-1 flex flex-col p-2 lg:p-6 gap-6 overflow-y-auto">
        
        {/* Top Bar (Status) */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    TARGET LOCKED
                </h2>
                <p className="text-xs text-slate-500 mt-1">Serveur d'analyse émotionnelle v2.4 (Hugging Face)</p>
            </div>
            <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase">Temps Session</div>
                    <div className="font-mono text-xl text-green-400">{sessionTime}</div>
                </div>
                <div className="h-10 w-[1px] bg-slate-700 mx-2"></div>
                <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase">Emotion Dominante</div>
                    <div className={`font-bold text-lg ${getEmotionColor(detectedEmotion)}`}>{detectedEmotion}</div>
                </div>
            </div>
        </div>

        {/* --- VIDEO ZONE (THE GREEN FRAME) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: VIDEO + UPLOAD */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* VIDEO CONTAINER */}
                <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl group">
                    {/* Le flux vidéo */}
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* OVERLAY "HUD" (Le Cadre Vert + Visage) */}
                    {isRecording && (
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Coins du cadre vert */}
                            <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-green-500/80 rounded-tl-lg"></div>
                            <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-green-500/80 rounded-tr-lg"></div>
                            <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-green-500/80 rounded-bl-lg"></div>
                            <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-green-500/80 rounded-br-lg"></div>
                            
                            {/* Cible centrale */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-green-500/30 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <div className="absolute w-full h-[1px] bg-green-500/30"></div>
                                <div className="absolute h-full w-[1px] bg-green-500/30"></div>
                            </div>

                            {/* Scan line effect */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/5 to-transparent animate-scan"></div>
                        </div>
                    )}

                    {/* Bouton Play/Stop Central si non démarré */}
                    {!isRecording && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                            <Button onClick={handleStart} className="h-20 w-20 rounded-full bg-green-600 hover:bg-green-500 text-black shadow-[0_0_30px_rgba(22,163,74,0.6)] transition-all transform hover:scale-110">
                                {isConnected ? <Play className="w-8 h-8 fill-black" /> : <Loader2 className="w-8 h-8 animate-spin"/>}
                            </Button>
                        </div>
                    )}
                </div>

                {/* UPLOAD ZONE (Style Desktop conservé) */}
                <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-xl p-6 text-center transition-colors hover:bg-slate-800/50">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                            <Upload className="w-6 h-6"/>
                        </div>
                        <div>
                            <h3 className="text-white font-medium">Charger Média</h3>
                            <p className="text-sm text-slate-500">Glissez un fichier ici ou cliquez pour analyser une vidéo pré-enregistrée</p>
                        </div>
                        <Input type="file" onChange={handleFileUpload} className="hidden" id="file-upload"/>
                        <Button variant="outline" className="mt-2 border-slate-700 text-slate-300 hover:text-white" onClick={() => document.getElementById('file-upload')?.click()}>
                            Parcourir les fichiers
                        </Button>
                        {uploadedFile && <div className="text-xs text-green-500 mt-2">Fichier prêt : {uploadedFile.name}</div>}
                    </div>
                </div>

            </div>

            {/* Right Column: METRICS PANEL */}
            <div className="space-y-4">
                
                {/* Control Panel */}
                <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardHeader className="pb-2"><CardTitle className="text-sm uppercase text-slate-500">Contrôle Session</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="Prénom" className="bg-slate-950 border-slate-800" value={firstName} onChange={e => setFirstName(e.target.value)}/>
                            <Input placeholder="Nom" className="bg-slate-950 border-slate-800" value={lastName} onChange={e => setLastName(e.target.value)}/>
                        </div>
                        {isRecording ? (
                            <Button onClick={handleStop} variant="destructive" className="w-full h-12 font-bold shadow-lg shadow-red-900/20">
                                <StopCircle className="mr-2 w-5 h-5"/> ARRÊTER L'ANALYSE
                            </Button>
                        ) : (
                            <Button onClick={handleStart} className="w-full h-12 bg-green-600 hover:bg-green-500 text-black font-bold shadow-lg shadow-green-900/20">
                                <Camera className="mr-2 w-5 h-5"/> DÉMARRER CAMÉRA
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Metrics Details */}
                <Card className="bg-slate-900 border-slate-800 text-white flex-1">
                    <CardHeader className="pb-2"><CardTitle className="text-sm uppercase text-slate-500 flex items-center gap-2"><Zap className="w-4 h-4"/> Métriques IA</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        
                        {/* Engagement */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-300">Compréhension</span>
                                <span className="font-bold text-green-400">{metrics.engagement}%</span>
                            </div>
                            <Progress value={metrics.engagement} className="h-2 bg-slate-950" indicatorColor="bg-green-500" />
                            <p className="text-[10px] text-slate-500">Niveau d'attention cognitive</p>
                        </div>

                        {/* Satisfaction */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-300">Satisfaction</span>
                                <span className="font-bold text-blue-400">{metrics.satisfaction}%</span>
                            </div>
                            <Progress value={metrics.satisfaction} className="h-2 bg-slate-950" indicatorColor="bg-blue-500" />
                            <p className="text-[10px] text-slate-500">Valence émotionnelle positive</p>
                        </div>

                        {/* Crédibilité */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-300">Crédibilité</span>
                                <span className="font-bold text-purple-400">{metrics.loyalty}%</span>
                            </div>
                            <Progress value={metrics.loyalty} className="h-2 bg-slate-950" indicatorColor="bg-purple-500" />
                            <p className="text-[10px] text-slate-500">Confiance envers le message</p>
                        </div>

                        {/* Conviction (GROS) */}
                        <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 text-center">
                            <div className="text-xs text-slate-500 uppercase mb-1">Score de Conviction</div>
                            <div className="text-4xl font-black text-white">{metrics.conviction}%</div>
                            <div className="text-xs text-green-500 mt-1 flex items-center justify-center gap-1">
                                {metrics.conviction > 50 ? "Intéressé 👍" : "Sceptique 👎"}
                            </div>
                        </div>

                    </CardContent>
                </Card>

            </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-600 uppercase tracking-widest">
            <div>System Ready</div>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                SERVEUR STARTECH {isConnected ? "ONLINE" : "OFFLINE"}
            </div>
        </div>

      </main>

      {/* CSS POUR L'ANIMATION DE SCAN (TARGET LOCKED) */}
      <style jsx global>{`
        @keyframes scan {
            0% { transform: translateY(-100%); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(100%); opacity: 0; }
        }
        .animate-scan {
            animation: scan 3s linear infinite;
        }
      `}</style>
    </div>
  )
}