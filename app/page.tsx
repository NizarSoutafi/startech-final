"use client"

import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Video, Mic, StopCircle, Play, Loader2, Camera, User } from "lucide-react"

// URL du Backend (Hugging Face)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function Recorder() {
  const [step, setStep] = useState<"form" | "recording" | "finished">("form")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [clientId, setClientId] = useState("Demo Event") // Fixé pour la démo
  
  const [socket, setSocket] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [detectedEmotion, setDetectedEmotion] = useState<string>("...")
  const [score, setScore] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // --- 1. CONNEXION SOCKET ---
  useEffect(() => {
    const newSocket = io(API_URL, { transports: ["websocket"] })
    
    newSocket.on("connect", () => {
      console.log("🟢 Connecté au serveur")
      setIsConnected(true)
    })

    newSocket.on("metrics_update", (data: any) => {
      setDetectedEmotion(data.emotion)
      setScore(Math.round(data.metrics.satisfaction))
    })

    setSocket(newSocket)
    return () => { newSocket.close() }
  }, [])

  // --- 2. GESTION CAMÉRA ---
  const startCamera = async () => {
    try {
      // "facingMode: user" force la caméra avant sur mobile
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, 
        audio: false 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      alert("Erreur Caméra: Vérifiez les permissions.")
    }
  }

  // --- 3. START / STOP ---
  const handleStart = () => {
    if (!firstName) return alert("Entrez un prénom !")
    setStep("recording")
    startCamera()

    if (socket) {
      socket.emit("start_session", { firstName, lastName, clientId })
      intervalRef.current = setInterval(() => sendFrame(), 200) // 5 FPS
    }
  }

  const sendFrame = () => {
    if (!videoRef.current || !canvasRef.current || !socket) return
    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    canvasRef.current.width = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)

    const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.5)
    socket.emit("process_frame", dataUrl)
  }

  const handleStop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (socket) socket.emit("stop_session")
    
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }
    setStep("finished")
  }

  // --- INTERFACE (RESPONSIVE) ---
  if (step === "form") return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Startech <span className="text-green-600">Vision</span></h1>
        <p className="text-slate-500 text-sm">Démo Event Mobile</p>
      </div>

      <Card className="w-full max-w-md shadow-lg border-slate-100">
        <CardHeader><CardTitle className="text-center">Nouvelle Session</CardTitle></CardHeader>
        <CardContent className="space-y-4">
            <Input placeholder="Prénom" value={firstName} onChange={e => setFirstName(e.target.value)} className="text-lg py-6" />
            <Input placeholder="Nom" value={lastName} onChange={e => setLastName(e.target.value)} className="text-lg py-6" />
            
            <Button className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 mt-4" onClick={handleStart} disabled={!isConnected}>
              {isConnected ? "Lancer le Test" : "Connexion..."}
            </Button>
        </CardContent>
      </Card>
    </div>
  )

  if (step === "recording") return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
       {/* HEADER OVERLAY */}
       <div className="absolute top-4 left-4 right-4 z-10 flex justify-between text-white">
          <div className="bg-red-600 px-3 py-1 rounded-full text-xs font-bold animate-pulse">REC</div>
          <div className="text-right">
             <div className="text-2xl font-bold">{score}%</div>
             <div className="text-sm opacity-80 uppercase">{detectedEmotion}</div>
          </div>
       </div>

       {/* VIDEO */}
       <div className="w-full max-w-md aspect-[3/4] bg-slate-900 relative rounded-lg overflow-hidden shadow-2xl">
           <video 
             ref={videoRef} 
             autoPlay 
             playsInline // IMPORTANT POUR MOBILE
             muted 
             className="w-full h-full object-cover transform scale-x-[-1]" // Miroir
           />
           <canvas ref={canvasRef} className="hidden" />
       </div>

       {/* STOP BUTTON */}
       <div className="absolute bottom-8 z-20">
           <Button variant="destructive" className="h-20 w-20 rounded-full border-4 border-white shadow-xl" onClick={handleStop}>
               <StopCircle className="w-10 h-10" />
           </Button>
       </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <User className="w-10 h-10 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Merci {firstName} !</h2>
      <p className="text-slate-500 mb-8">Analyse terminée avec succès.</p>
      
      <Button className="w-full max-w-xs h-12 text-lg mb-3" onClick={() => setStep("form")}>Nouveau Test</Button>
      <Button variant="outline" className="w-full max-w-xs h-12" onClick={() => window.location.href = "/admin"}>Voir Admin</Button>
    </div>
  )
}