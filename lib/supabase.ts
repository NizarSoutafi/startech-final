import { createClient } from '@supabase/supabase-js'

// ⚠️ REMPLACEZ PAR VOS CLÉS (Supabase > Settings > API)
const supabaseUrl = 'https://gwjrwejdjpctizolfkcz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3anJ3ZWpkanBjdGl6b2xma2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTgxMjQsImV4cCI6MjA4NDY3NDEyNH0.ZpSQrRhsfc1Y77r_rdT8yIpn419ZOpKnfAKAM8X_1b8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)