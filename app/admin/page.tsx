"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { login, isAuthenticated } from "@/lib/storage"
import { MapPin, Eye, EyeOff, ArrowRight } from "lucide-react"

export default function AdminLoginPage() {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/admin/dashboard")
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    await new Promise((r) => setTimeout(r, 400))
    if (login(password)) {
      router.push("/admin/dashboard")
    } else {
      setError("Incorrect password. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — brand ── */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 bg-hero-bg text-nav-text px-12 py-14">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-sm flex items-center justify-center">
            <MapPin className="w-4 h-4 text-accent-foreground" />
          </div>
          <span className="font-serif text-base font-semibold tracking-wide">Property Navigator</span>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-widest opacity-40 mb-3">Admin Portal</p>
          <h2 className="font-serif text-4xl font-bold leading-tight text-balance">
            Manage your<br />estate routes
          </h2>
          <p className="mt-4 text-sm opacity-50 leading-relaxed max-w-xs">
            Set reception points, record GPS paths to every home, and guide your guests with ease.
          </p>
        </div>

        <div className="space-y-3">
          {["Set reception point on map", "Record paths by driving them", "Guests navigate in real-time"].map((f) => (
            <div key={f} className="flex items-center gap-2.5">
              <div className="w-1 h-1 rounded-full bg-accent" />
              <span className="text-sm opacity-60">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background px-6 py-14">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-serif text-lg font-semibold tracking-wide text-foreground">
            Property Navigator
          </span>
        </div>

        <div className="w-full max-w-sm">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
            Admin Access
          </p>
          <h1 className="font-serif text-3xl font-bold text-foreground mb-8">
            Sign in
          </h1>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring rounded-sm transition-all text-sm"
                  placeholder="Enter your admin password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-primary text-primary-foreground text-sm font-medium rounded-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Default password:{" "}
              <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                admin1234
              </code>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Change it in <code className="font-mono">/lib/storage.ts</code>
            </p>
          </div>
        </div>

        <div className="mt-10">
          <a
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to guest view
          </a>
        </div>
      </div>
    </div>
  )
}
