"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Fingerprint, Shield, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function Home() {
  const router = useRouter()
  const [projectId, setProjectId] = useState("")

  const handleJoinTest = (e: React.FormEvent) => {
    e.preventDefault()
    if (projectId.trim()) {
      router.push(`/test/${projectId.trim()}`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-100 via-slate-50 to-white opacity-80"></div>
      
      <Card className="w-full max-w-md border-slate-200 bg-white shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-50 flex items-center justify-center border border-green-100 shadow-sm">
            <Fingerprint className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">STARTECH <span className="text-green-600">VISION</span></CardTitle>
            <CardDescription className="text-slate-500">Plateforme d'analyse émotionnelle</CardDescription>
          </div>
        </CardHeader>
        
        <form onSubmit={handleJoinTest}>
          <CardContent className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center">
              <p className="text-sm text-slate-600 mb-4">Vous avez été invité à participer à un test ? Entrez votre code d'accès ci-dessous.</p>
              <div className="space-y-2 text-left">
                <Label htmlFor="projectId" className="text-xs uppercase tracking-widest text-slate-500">Code du Test</Label>
                <Input 
                  id="projectId" 
                  placeholder="Ex: DEMO-PUB-2026" 
                  className="bg-white border-slate-200 text-slate-900 focus:border-green-500 h-11 text-center font-mono font-bold tracking-wider" 
                  value={projectId} 
                  onChange={e => setProjectId(e.target.value)} 
                  required 
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg font-bold shadow-lg shadow-green-200 gap-2">
              REJOINDRE LE TEST <ArrowRight className="w-5 h-5" />
            </Button>
            
            <div className="relative w-full py-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">Ou</span></div>
            </div>

            <Link href="/admin" className="w-full">
              <Button variant="outline" type="button" className="w-full h-12 text-slate-700 border-slate-300 hover:bg-slate-50 gap-2">
                <Shield className="w-4 h-4" /> ACCÈS ANALYSTE
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}