"use client"

import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Video, Mic, StopCircle, Play, Loader2, Camera, User, Smile } from "lucide-react"

// URL du Backend (Hugging Face)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function MobileRecorder() {
  // --- STATES ---
  const [step, setStep] = useState<"form" | "recording" | "finished">("form")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [clientId, setClientId] = useState("Demo Event")
  
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
      console.log("🟢 Connecté au serveur Mobile")
      setIsConnected(true)
    })

    newSocket.on("metrics_update", (data: any) => {
      // Feedback visuel immédiat pour la démo
      setDetectedEmotion(data.emotion)
      setScore(Math.round(data.metrics.satisfaction)) // On affiche la satisfaction comme "Score"
    })

    setSocket(newSocket)
    return () => { newSocket.close() }
  }, [])

  // --- 2. GESTION CAMÉRA (MOBILE FRONT) ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, // Force la caméra avant
        audio: false 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      alert("Impossible d'accéder à la caméra. Vérifiez les permissions.")
    }
  }

  // --- 3. DÉMARRER SESSION ---
  const handleStart = () => {
    if (!firstName) return alert("Entrez un prénom !")
    setStep("recording")
    startCamera()

    // Envoyer les infos au serveur
    if (socket) {
      socket.emit("start_session", { firstName, lastName, clientId })
      
      // Boucle d'envoi d'images (toutes les 200ms pour pas surcharger la 4G)
      intervalRef.current = setInterval(() => {
        sendFrame()
      }, 200)
    }
  }

  const sendFrame = () => {
    if (!videoRef.current || !canvasRef.current || !socket) return
    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    canvasRef.current.width = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)

    const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.5) // Qualité moyenne pour vitesse
    socket.emit("process_frame", dataUrl)
  }

  // --- 4. STOPPER SESSION ---
  const handleStop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (socket) socket.emit("stop_session")
    
    // Couper la caméra
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }
    
    setStep("finished")
  }

  // --- EMOJI MAP ---
  const getEmoji = (emo: string) => {
    const map: any = { happy: "😁", surprise: "😲", neutral: "😐", sad: "😔", angry: "😡", fear: "😨", disgust: "🤢" }
    return map[emo] || "🤔"
  }

  // --- RENDU : ÉCRAN 1 (FORMULAIRE) ---
  if (step === "form") return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-8 animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Camera className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Startech <span className="text-green-600">Vision</span></h1>
        <p className="text-slate-500 text-sm mt-2">Expérience Émotionnelle IA</p>
      </div>

      <Card className="w-full max-w-sm border-0 shadow-xl bg-slate-50">
        <CardContent className="p-6 space-y-4">
          <div className="text-left space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Prénom</label>
            <Input 
              placeholder="Ex: Nizar" 
              value={firstName} 
              onChange={e => setFirstName(e.target.value)}
              className="h-12 text-lg bg-white"
            />
          </div>
          <div className="text-left space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Nom (Optionnel)</label>
            <Input 
              placeholder="Ex: Soutafi" 
              value={lastName} 
              onChange={e => setLastName(e.target.value)}
              className="h-12 text-lg bg-white"
            />
          </div>
          
          <Button 
            className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 rounded-xl mt-4"
            onClick={handleStart}
            disabled={!isConnected}
          >
            {isConnected ? "📸 COMMENCER LE TEST" : "Connexion..."}
          </Button>
          
          {!isConnected && <p className="text-xs text-orange-500 animate-pulse">Connexion au serveur IA...</p>}
        </CardContent>
      </Card>
      
      <p className="mt-8 text-xs text-slate-400">Powered by Startech Vision © 2026</p>
    </div>
  )

  // --- RENDU : ÉCRAN 2 (ENREGISTREMENT) ---
  if (step === "recording") return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* HEADER OVERLAY */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
         <div>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/90 text-white animate-pulse">
              🔴 REC
            </span>
         </div>
         <div className="flex flex-col items-end">
            <div className="text-4xl">{getEmoji(detectedEmotion)}</div>
            <div className="text-white font-bold text-xs mt-1 bg-black/30 px-2 py-1 rounded backdrop-blur-md">
                Satisfaction: {score}%
            </div>
         </div>
      </div>

      {/* VIDEO PLEIN ÉCRAN */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-full object-cover" // Important pour mobile : remplit tout l'écran
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* FOOTER BUTTON */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-black/80 to-transparent flex justify-center pb-10">
        <Button 
          variant="destructive" 
          size="lg" 
          className="h-16 w-16 rounded-full border-4 border-white/20 shadow-2xl flex items-center justify-center bg-red-600 hover:bg-red-700"
          onClick={handleStop}
        >
          <StopCircle className="w-8 h-8 fill-white" />
        </Button>
      </div>
    </div>
  )

  // --- RENDU : ÉCRAN 3 (FIN) ---
  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center animate-in slide-in-from-bottom-10 duration-500">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <Smile className="w-12 h-12 text-green-600" />
      </div>
      <h2 className="text-3xl font-bold text-slate-900 mb-2">Merci {firstName} !</h2>
      <p className="text-slate-600 mb-8 max-w-xs mx-auto">Ton analyse émotionnelle a bien été enregistrée.</p>
      
      <div className="space-y-3 w-full max-w-xs">
        <Button 
            className="w-full h-12 text-lg bg-slate-900 text-white shadow-xl"
            onClick={() => setStep("form")}
        >
            🔄 Nouveau Test
        </Button>
        <Button 
            variant="outline"
            className="w-full h-12 text-slate-600 border-slate-300"
            onClick={() => window.location.href = "/admin"} // Lien secret vers l'admin
        >
            📊 Voir les Résultats
        </Button>
      </div>
    </div>
  )
}