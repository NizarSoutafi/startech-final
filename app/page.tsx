"use client"

import { useState, useEffect, useRef } from "react"
import MetricsPanel from "@/components/neurolink/metrics-panel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Play, Square, RotateCcw, Zap, Fingerprint, Shield, Target, Upload, FileText, Music, FileSpreadsheet, File as FileIcon, X } from "lucide-react"
import { io, Socket } from "socket.io-client"
import Link from "next/link"

// ADRESSE DU BACKEND
const API_URL = "https://persee-tech-startech-event-backend.hf.space"

interface UserInfo { firstName: string; lastName: string; clientId: string }

export default function Dashboard() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [sessionTime, setSessionTime] = useState(0)
  const [formData, setFormData] = useState({ firstName: "", lastName: "", clientId: "" })
  
  const [currentMetrics, setCurrentMetrics] = useState({ 
    engagement: 0, 
    satisfaction: 50, 
    trust: 50, 
    loyalty: 50, 
    opinion: 50, 
    conversion: 0,
    lbl_conv: "En attente",
    emotion: "neutral" 
  })
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [faceCoords, setFaceCoords] = useState<any>(null)
  const [cameraActive, setCameraActive] = useState(false)

  // ETATS MEDIA
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'video' | 'image' | 'pdf' | 'audio' | 'csv' | 'excel' | 'other' | null>(null)
  const [csvContent, setCsvContent] = useState<string[][]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (userInfo && !cameraActive) {
      navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: "user", 
            width: { ideal: 480 }, 
            height: { ideal: 360 } 
        } 
      })
        .then(stream => { if (videoRef.current) { videoRef.current.srcObject = stream; setCameraActive(true) } })
        .catch(err => console.error("Erreur Webcam:", err))
    }
  }, [userInfo, cameraActive])

  useEffect(() => {
    if (!userInfo) return;
    
    const newSocket = io(API_URL, {
        transports: ["websocket", "polling"],
        path: "/socket.io/",
        secure: true,
    })
    
    newSocket.on("connect", () => setIsConnected(true))
    newSocket.on("disconnect", () => setIsConnected(false))
    
    newSocket.on("metrics_update", (data: any) => {
      setSessionTime(data.session_time); 
      setIsRecording(data.is_recording)
      setFaceCoords(data.face_coords)
      
      const newMetrics = { 
        emotion: data.emotion,
        engagement: data.metrics.engagement, 
        satisfaction: data.metrics.satisfaction,
        trust: data.metrics.trust, 
        loyalty: data.metrics.loyalty, 
        opinion: data.metrics.opinion,
        conversion: data.metrics.conversion || 0,
        lbl_conv: data.metrics.lbl_conv || "Analysing..."
      }
      setCurrentMetrics(newMetrics)
    })

    setSocket(newSocket)

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setMediaFile(file)
      const url = URL.createObjectURL(file)
      setMediaUrl(url)
      setCsvContent([])
      const type = file.type; const name = file.name.toLowerCase()
      if (type.startsWith('video/')) setMediaType('video')
      else if (type.startsWith('image/')) setMediaType('image')
      else if (type.startsWith('audio/')) setMediaType('audio')
      else if (type === 'application/pdf') setMediaType('pdf')
      else if (name.endsWith('.csv')) {
          setMediaType('csv')
          const reader = new FileReader()
          reader.onload = (event) => {
              const text = event.target?.result as string
              const rows = text.split('\n').slice(0, 10).map(row => row.split(/[;,]/))
              setCsvContent(rows)
          }
          reader.readAsText(file)
      }
      else if (name.endsWith('.xlsx') || name.endsWith('.xls')) setMediaType('excel')
      else setMediaType('other')
    }
  }

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); if (formData.firstName && formData.lastName) setUserInfo(formData) }
  
  const handleStartStop = () => { 
      if (socket && userInfo) { 
          if (isRecording) {
              socket.emit("stop_session")
              setIsRecording(false) 
          } else {
              setSessionTime(0)
              socket.emit("start_session", userInfo)
              setIsRecording(true) 
          }
      } 
  }

  const handleReset = () => { if (socket) socket.emit("stop_session"); setSessionTime(0); setCurrentMetrics(prev => ({ ...prev, engagement: 0, emotion: "neutral", conversion: 0 })) }
  const handleLogout = () => { setUserInfo(null); setSessionTime(0); setCameraActive(false); if(socket) socket.disconnect() }
  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
  const getEmotionDisplay = (e: string) => { const map: any = { happy: "😄 JOIE", sad: "😢 TRISTESSE", angry: "😠 COLÈRE", surprise: "😲 SURPRISE", fear: "😨 PEUR", neutral: "😐 NEUTRE" }; return map[e] || e.toUpperCase() }

  // FONCTION D'AFFICHAGE DU MEDIA (CORRIGÉE)
  const renderMediaContent = () => {
    if (!mediaUrl) {
      return (
        <div className="text-center text-slate-400">
            <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3"><Upload className="w-6 h-6 text-slate-300" /></div>
            <p className="text-sm font-medium">Glissez un fichier</p>
        </div>
      )
    }

    switch (mediaType) {
      case 'video':
        return <video src={mediaUrl} controls className="w-full max-h-full rounded shadow-sm" />
      case 'image':
        return <img src={mediaUrl} alt="Support" className="w-full max-h-full object-contain rounded shadow-sm" />
      case 'audio':
        return (
          <div className="w-full max-w-md bg-white p-6 rounded-xl shadow-lg border border-slate-200 text-center">
             <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"><Music className="w-8 h-8 text-green-600" /></div>
             <h3 className="text-sm font-bold text-slate-800 mb-2 truncate">{mediaFile?.name}</h3>
             <audio src={mediaUrl} controls className="w-full" />
          </div>
        )
      case 'pdf':
        return <iframe src={mediaUrl} className="w-full h-full rounded border border-slate-200 bg-white" title="PDF Viewer" />
      case 'csv':
        return (
          <div className="w-full bg-white rounded border border-slate-200 overflow-hidden flex flex-col max-h-full">
              <div className="p-2 bg-slate-50 border-b border-slate-100 font-mono text-xs font-bold text-slate-500 flex gap-2 items-center"><FileSpreadsheet className="w-4 h-4 text-green-600"/> CSV</div>
              <div className="overflow-auto p-0"><table className="w-full text-xs text-left"><tbody>{csvContent.map((row, i) => (<tr key={i} className={i===0 ? "bg-slate-100 font-bold" : "border-b border-slate-50 hover:bg-slate-50"}>{row.map((cell, j) => (<td key={j} className="p-2 border-r border-slate-100 truncate max-w-[150px]">{cell}</td>))}</tr>))}</tbody></table></div>
          )
      case 'excel':
         return (
             <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200 max-w-sm">
                 <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4"><FileSpreadsheet className="w-10 h-10 text-green-600" /></div>
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Fichier Excel Chargé</h3>
                 <p className="text-sm text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 mb-4 break-all font-mono">{mediaFile?.name}</p>
             </div>
         )
      default:
        return (<div className="text-center p-8"><FileIcon className="w-12 h-12 text-slate-300 mx-auto mb-2"/><p className="text-slate-600 font-bold">{mediaFile?.name}</p></div>)
    }
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden text-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-white opacity-80"></div>
        <Card className="w-full max-w-md border-slate-200 bg-white shadow-2xl relative z-10">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-50 flex items-center justify-center border border-green-100 shadow-sm"><Fingerprint className="w-10 h-10 text-green-600" /></div>
            <div><CardTitle className="text-3xl font-bold tracking-tight text-slate-900">STARTECH <span className="text-green-600">ID</span></CardTitle></div>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="firstName" className="text-xs uppercase tracking-widest text-slate-500">Prénom</Label><Input id="firstName" className="h-11" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required /></div>
              <div className="space-y-2"><Label htmlFor="lastName" className="text-xs uppercase tracking-widest text-slate-500">Nom</Label><Input id="lastName" className="h-11" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required /></div>
              <div className="space-y-2"><Label htmlFor="clientId" className="text-xs uppercase tracking-widest text-slate-500">Code Projet</Label><Input id="clientId" className="h-11" value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} /></div>
            </CardContent>
            <div className="p-6 pt-0"><Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg font-bold">INITIALISER SESSION</Button></div>
          </form>
        </Card>
        <div className="absolute bottom-6 right-6 z-20"><Link href="/admin"><Button variant="ghost" className="text-slate-500 text-xs gap-2"><Shield className="w-3 h-3" /> Accès Admin</Button></Link></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="flex h-16 items-center px-4 md:px-6 justify-between">
           <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-slate-900"><div className="w-3 h-3 rounded-full bg-green-500 shadow-lg animate-pulse" />STARTECH <span className="text-slate-400 font-normal hidden md:inline">VISION</span></div>
           <div className="flex items-center gap-2 md:gap-4">
              <div className="flex items-center gap-2 md:gap-3 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
                 <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold text-white">{userInfo.firstName.charAt(0)}</div>
                 <div className="flex flex-col"><span className="text-sm font-bold text-slate-900 leading-none">{userInfo.firstName}</span></div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-500 hover:text-red-600"><X className="w-5 h-5"/></Button>
           </div>
        </div>
      </header>

      <main className="flex-1 p-3 md:p-6 lg:p-8 overflow-y-auto flex flex-col gap-4 md:gap-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            
            {/* WEBCAM */}
            <Card className="border-slate-300 bg-white shadow-xl relative overflow-hidden flex-none group h-[400px] lg:h-[500px]">
              {/* Cadre Vert (Overlay) - Utilisation de CSS inline pour éviter les erreurs de build */}
              <div className="absolute top-4 left-4 w-12 h-12 lg:w-16 lg:h-16 border-l-4 border-t-4 border-green-500 z-20 rounded-tl-lg opacity-80" />
              <div className="absolute top-4 right-4 w-12 h-12 lg:w-16 lg:h-16 border-r-4 border-t-4 border-green-500 z-20 rounded-tr-lg opacity-80" />
              <div className="absolute bottom-4 left-4 w-12 h-12 lg:w-16 lg:h-16 border-l-4 border-b-4 border-green-500 z-20 rounded-bl-lg opacity-80" />
              <div className="absolute bottom-4 right-4 w-12 h-12 lg:w-16 lg:h-16 border-r-4 border-b-4 border-green-500 z-20 rounded-br-lg opacity-80" />
              
              <div className={`absolute inset-x-0 h-0.5 bg-green-500 shadow-lg z-10 transition-opacity duration-300 ${isRecording ? 'opacity-100 animate-pulse' : 'opacity-0'}`} style={{ top: '50%' }} />
              <div className={`absolute top-0 w-full h-1 bg-red-500 animate-pulse z-30 transition-opacity duration-300 ${isRecording ? 'opacity-100' : 'opacity-0'}`} />

              <CardContent className="p-0 h-full relative flex flex-col items-center justify-center bg-black overflow-hidden rounded-md m-1">
                <canvas ref={canvasRef} width="480" height="360" className="hidden" />
                <div className="absolute inset-0 w-full h-full relative">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    <div className={`absolute border-2 border-green-500 z-50 transition-all duration-100 ease-linear ${faceCoords ? 'opacity-100' : 'opacity-0'}`} style={{ left: faceCoords ? `${(faceCoords.x / 480) * 100}%` : '0%', top: faceCoords ? `${(faceCoords.y / 360) * 100}%` : '0%', width: faceCoords ? `${(faceCoords.w / 480) * 100}%` : '0%', height: faceCoords ? `${(faceCoords.h / 360) * 100}%` : '0%', transform: 'scaleX(-1)' }}>
                          <div className="absolute -top-6 left-0 bg-green-500 text-black text-[10px] font-bold px-1 scale-x-[-1]">TARGET LOCKED</div>
                    </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-30"><Target className="w-64 h-64 text-white stroke-1" /></div>
                
                <div className="z-20 w-full px-4 md:px-8 pb-4 md:pb-8 mt-auto absolute bottom-0">
                  <div className="flex justify-between items-end mb-4 md:mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={`px-2 py-1 md:px-3 border-none backdrop-blur-md ${isRecording ? "bg-red-600 text-white animate-pulse" : "bg-white/20 text-white"}`}>
                                <div className={`w-2 h-2 rounded-full mr-2 ${isRecording ? "bg-white" : "bg-slate-300"}`} />
                                <span suppressHydrationWarning>{isRecording ? "REC" : "PRÊT"}</span>
                            </Badge>
                        </div>
                        <div className="text-5xl md:text-7xl font-mono font-bold text-white tabular-nums tracking-tighter drop-shadow-lg">{formatTime(sessionTime)}</div>
                    </div>
                    <div className="text-right">
                        <div className="bg-white/90 backdrop-blur-xl px-3 py-2 md:px-6 md:py-4 rounded-xl border border-white shadow-2xl">
                            <span className="block text-[8px] md:text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Emotion</span>
                            <span className="text-xl md:text-3xl font-bold text-slate-900 flex items-center justify-end gap-3" suppressHydrationWarning>{getEmotionDisplay(currentMetrics.emotion)}</span>
                        </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-4 md:gap-8 pt-4 md:pt-6 border-t border-white/20">
                    <Button size="icon" variant="outline" onClick={handleReset} className="h-12 w-12 md:h-14 md:w-14 rounded-full border border-white/20 bg-white/10 text-white hover:bg-white hover:text-black backdrop-blur-md transition-all"><RotateCcw className="h-5 w-5" /></Button>
                    <Button onClick={handleStartStop} variant={isRecording ? "destructive" : "default"} className={`px-8 md:px-10 h-12 md:h-14 text-lg font-bold rounded-full transition-all hover:scale-105 ${!isRecording ? "bg-green-600 hover:bg-green-500 text-white" : "shadow-lg"}`}>
                        {isRecording ? <Square className="mr-2 h-5 w-5 fill-current" /> : <Play className="mr-2 h-5 w-5 fill-current" />}
                        <span suppressHydrationWarning>{isRecording ? "STOP" : "GO"}</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* MEDIA */}
            <Card className="border-slate-200 bg-white shadow-md flex flex-col h-[300px] lg:h-[500px]">
              <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                <div><CardTitle className="text-sm uppercase tracking-wide text-slate-700 flex items-center gap-2"><FileText className="w-4 h-4 text-green-600" /> Support</CardTitle></div>
                <div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*,image/*,audio/*,application/pdf,.csv,.xlsx,.xls" className="hidden" />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs h-8 gap-2"><Upload className="w-3 h-3" /> Charger</Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex items-center justify-center bg-slate-100 flex-1 relative overflow-auto">
                 {/* APPEL DE LA FONCTION SAFE POUR EVITER L'ERREUR DE BUILD */}
                 {renderMediaContent()}
              </CardContent>
            </Card>
        </div>

        <div className="w-full flex flex-col gap-4">
            <MetricsPanel metrics={currentMetrics} />
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex justify-between items-center text-xs font-mono text-slate-500">
               <div className="flex items-center gap-2"><Zap className={`w-3 h-3 ${isConnected ? "text-green-500" : "text-red-500"}`} />SERVEUR STARTECH</div>
               <span className={isConnected ? "text-green-600 font-bold bg-green-50 px-2 py-1 rounded" : "text-red-500 bg-red-50 px-2 py-1 rounded"}>{isConnected ? "ONLINE" : "OFFLINE"}</span>
            </div>
        </div>

      </main>
    </div>
  )
}