"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Lock, AlertCircle, Mail } from "lucide-react"

export default function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("")
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError("Erreur : " + error.message); setLoading(false) } 
    else { localStorage.setItem("startech_admin_token", "authorized_access_granted"); router.push("/admin") }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-white opacity-80"></div>
      <Card className="w-full max-w-md border-slate-200 bg-white shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm"><Lock className="w-8 h-8 text-blue-600" /></div>
          <div><CardTitle className="text-2xl font-bold tracking-tight text-slate-900">STARTECH <span className="text-blue-600">ADMIN</span></CardTitle><CardDescription className="text-slate-500">Connexion Cloud Sécurisée</CardDescription></div>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="email" className="text-slate-700">Email Admin</Label><div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input id="email" type="email" placeholder="admin@startech.com" className="pl-10" value={email} onChange={e => setEmail(e.target.value)} required /></div></div>
            <div className="space-y-2"><Label htmlFor="password" className="text-slate-700">Mot de passe</Label><div className="relative"><Shield className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input id="password" type="password" placeholder="••••••••" className="pl-10" value={password} onChange={e => setPassword(e.target.value)} required /></div></div>
            {error && <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-100"><AlertCircle className="w-4 h-4" />{error}</div>}
          </CardContent>
          <CardFooter><Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>{loading ? "Connexion..." : "Se connecter"}</Button></CardFooter>
        </form>
      </Card>
    </div>
  )
}