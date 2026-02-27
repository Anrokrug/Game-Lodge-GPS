"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { login, isAuthenticated } from "@/lib/storage"
import { MapPin, Eye, EyeOff, ArrowRight } from "lucide-react"

const DARK_GREEN = "#122918"
const AMBER = "#c47c2a"
const PRIMARY = "#1e4a28"

export default function AdminLoginPage() {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated()) router.replace("/admin/dashboard")
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
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Left brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-96 flex-shrink-0 px-12 py-14"
        style={{ backgroundColor: DARK_GREEN, color: "#f0ede6" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: AMBER }}>
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-semibold tracking-wide" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Property Navigator
          </span>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ opacity: 0.4 }}>Admin Portal</p>
          <h2 className="text-4xl font-bold leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Manage your<br />estate routes
          </h2>
          <p className="mt-4 text-sm leading-relaxed max-w-xs" style={{ opacity: 0.5 }}>
            Set reception points, record GPS paths to every home, and guide your guests with ease.
          </p>
        </div>

        <div className="space-y-3">
          {["Set reception point on map", "Record paths by driving them", "Guests navigate in real-time"].map((f) => (
            <div key={f} className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: AMBER }} />
              <span className="text-sm" style={{ opacity: 0.65 }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-14" style={{ backgroundColor: "#f7f5f0" }}>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-wide" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1a2a1e" }}>
            Property Navigator
          </span>
        </div>

        <div className="w-full max-w-sm">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#6b7c6e" }}>Admin Access</p>
          <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1a2a1e" }}>
            Sign in
          </h1>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "#1a2a1e" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 text-sm rounded transition-all focus:outline-none"
                  style={{
                    border: "1px solid #dddbd4",
                    backgroundColor: "#ffffff",
                    color: "#1a2a1e",
                    boxShadow: "0 0 0 0px #1e4a28",
                  }}
                  onFocus={(e) => e.target.style.boxShadow = "0 0 0 2px #1e4a28"}
                  onBlur={(e) => e.target.style.boxShadow = "0 0 0 0px #1e4a28"}
                  placeholder="Enter your admin password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#6b7c6e" }}
                  aria-label={showPassword ? "Hide" : "Show"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm" style={{ color: "#b03a2e" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 text-sm font-medium rounded transition-all"
              style={{
                backgroundColor: loading || !password ? "#6b7c6e" : PRIMARY,
                color: "#f7f5f0",
                cursor: loading || !password ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

          <div className="mt-8 pt-6" style={{ borderTop: "1px solid #dddbd4" }}>
            <p className="text-xs" style={{ color: "#6b7c6e" }}>
              Default password:{" "}
              <code className="px-1.5 py-0.5 rounded text-sm" style={{ backgroundColor: "#eceae4", color: "#1a2a1e", fontFamily: "monospace" }}>
                admin1234
              </code>
            </p>
            <p className="text-xs mt-1" style={{ color: "#6b7c6e" }}>
              Change it in <code style={{ fontFamily: "monospace" }}>/lib/storage.ts</code>
            </p>
          </div>
        </div>

        <div className="mt-10">
          <a
            href="/"
            className="text-xs uppercase tracking-widest transition-colors"
            style={{ color: "#6b7c6e" }}
          >
            Back to guest view
          </a>
        </div>
      </div>
    </div>
  )
}
