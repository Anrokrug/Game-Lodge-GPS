"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { login, isAuthenticated } from "@/lib/storage"
import { Eye, EyeOff, MapPin, ArrowRight, Check } from "lucide-react"

const SERIF = "var(--font-playfair, 'Playfair Display', Georgia, serif)"

export default function AdminLoginPage() {
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
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
    await new Promise((r) => setTimeout(r, 350))
    if (login(password)) {
      router.push("/admin/dashboard")
    } else {
      setError("Incorrect password. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f7f5f0" }}>

      {/* ── LEFT BRAND PANEL (desktop only) ── */}
      <aside
        className="hidden lg:flex w-[400px] flex-shrink-0 flex-col justify-between px-12 py-14"
        style={{ backgroundColor: "#122918" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#c47c2a" }}
          >
            <MapPin size={18} color="#fff" />
          </div>
          <span className="text-base font-semibold" style={{ color: "#f0ede6", fontFamily: SERIF }}>
            Property Navigator
          </span>
        </div>

        {/* Headline */}
        <div>
          <p className="text-xs font-medium mb-4" style={{ color: "rgba(240,237,230,0.4)", letterSpacing: "0.14em" }}>
            ADMIN PORTAL
          </p>
          <h2
            className="text-4xl font-bold leading-snug mb-5"
            style={{ color: "#f0ede6", fontFamily: SERIF }}
          >
            Manage your<br />estate routes
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(240,237,230,0.5)", maxWidth: 280 }}>
            Set reception points, drive &amp; record paths to every home, and let your guests navigate with confidence.
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-3">
          {[
            "Pin your reception / gate on the map",
            "Record paths by driving them in real time",
            "Guests are guided turn by turn via GPS",
          ].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(196,124,42,0.25)", border: "1px solid rgba(196,124,42,0.5)" }}
              >
                <Check size={11} color="#c47c2a" />
              </div>
              <span className="text-sm" style={{ color: "rgba(240,237,230,0.6)" }}>{f}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── RIGHT FORM PANEL ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-14">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-12">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center"
            style={{ backgroundColor: "#122918" }}
          >
            <MapPin size={18} color="#fff" />
          </div>
          <span className="text-lg font-semibold" style={{ color: "#1a2a1e", fontFamily: SERIF }}>
            Property Navigator
          </span>
        </div>

        <div className="w-full max-w-sm">
          <p className="text-xs font-semibold mb-1.5" style={{ color: "#6b7c6e", letterSpacing: "0.12em" }}>
            ADMIN ACCESS
          </p>
          <h1 className="text-3xl font-bold mb-8" style={{ color: "#1a2a1e", fontFamily: SERIF }}>
            Sign in
          </h1>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Password field */}
            <div>
              <label
                htmlFor="pw"
                className="block text-xs font-semibold mb-2"
                style={{ color: "#1a2a1e", letterSpacing: "0.08em" }}
              >
                PASSWORD
              </label>
              <div className="relative">
                <input
                  id="pw"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  autoFocus
                  className="w-full rounded-md px-4 py-3 pr-11 text-sm transition-shadow"
                  style={{
                    border: "1px solid #dddbd4",
                    backgroundColor: "#fff",
                    color: "#1a2a1e",
                    outline: "none",
                    boxShadow: "none",
                  }}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px #1e4a28")}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  style={{ color: "#6b7c6e", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm" style={{ color: "#b03a2e" }}>{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-md py-3 px-5 text-sm font-semibold transition-opacity"
              style={{
                backgroundColor: loading || !password.trim() ? "#a0a8a2" : "#1e4a28",
                color: "#f7f5f0",
                cursor: loading || !password.trim() ? "not-allowed" : "pointer",
                border: "none",
              }}
            >
              {loading ? (
                <>
                  <span
                    className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0"
                    style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }}
                  />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Hint */}
          <div className="mt-8 pt-6" style={{ borderTop: "1px solid #dddbd4" }}>
            <p className="text-xs" style={{ color: "#6b7c6e" }}>
              Default password:{" "}
              <code
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ backgroundColor: "#eceae4", color: "#1a2a1e", fontFamily: "monospace" }}
              >
                admin1234
              </code>
            </p>
            <p className="text-xs mt-1.5" style={{ color: "#6b7c6e" }}>
              Change it in{" "}
              <code style={{ fontFamily: "monospace", color: "#1a2a1e" }}>/lib/storage.ts</code>
            </p>
          </div>
        </div>

        <div className="mt-10">
          <a
            href="/"
            className="text-xs font-medium transition-colors"
            style={{ color: "#6b7c6e", letterSpacing: "0.1em" }}
          >
            &larr; Back to guest view
          </a>
        </div>
      </main>
    </div>
  )
}
