"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { login, isAuthenticated } from "@/lib/auth"
import { Eye, EyeOff, MapPin, ArrowRight, Check } from "lucide-react"

const SERIF = "'Playfair Display', Georgia, serif"
const SANS = "'Inter', system-ui, sans-serif"

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
    <div style={{ minHeight: "100vh", display: "flex", backgroundColor: "#f7f5f0", fontFamily: SANS }}>

      {/* LEFT BRAND PANEL */}
      <aside style={{
        width: 420, flexShrink: 0, backgroundColor: "#122918",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "48px 44px",
      }}
        className="hidden lg:flex"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#c47c2a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MapPin size={17} color="#fff" />
          </div>
          <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: "#f0ede6" }}>Zebula Golf Estate &amp; Spa</span>
        </div>

        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(240,237,230,0.4)", letterSpacing: "0.14em", marginBottom: 16 }}>ADMIN PORTAL</p>
          <h2 style={{ fontFamily: SERIF, fontSize: 40, fontWeight: 800, color: "#f0ede6", lineHeight: 1.2, marginBottom: 18 }}>
            Manage your<br />estate routes
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(240,237,230,0.5)", maxWidth: 280 }}>
            Set reception points, drive &amp; record paths to every home, then let guests navigate with confidence.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            "Pin your reception or gate on the map",
            "Record paths by driving them in real time",
            "Guests are guided turn by turn via GPS",
          ].map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                backgroundColor: "rgba(196,124,42,0.2)", border: "1px solid rgba(196,124,42,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Check size={11} color="#c47c2a" />
              </div>
              <span style={{ fontSize: 13, color: "rgba(240,237,230,0.6)" }}>{f}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* RIGHT FORM */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>

        {/* Mobile logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }} className="lg:hidden">
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#122918", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MapPin size={17} color="#fff" />
          </div>
          <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: "#1a2a1e" }}>Zebula Golf Estate &amp; Spa</span>
        </div>

        <div style={{ width: "100%", maxWidth: 360 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7c6e", letterSpacing: "0.12em", marginBottom: 6 }}>ADMIN ACCESS</p>
          <h1 style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 800, color: "#1a2a1e", marginBottom: 36, lineHeight: 1.1 }}>Sign in</h1>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label htmlFor="pw" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#1a2a1e", letterSpacing: "0.1em", marginBottom: 8 }}>
                PASSWORD
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="pw"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  autoFocus
                  style={{
                    width: "100%", padding: "12px 44px 12px 14px", borderRadius: 8,
                    border: "1.5px solid #dddbd4", backgroundColor: "#fff",
                    fontSize: 14, color: "#1a2a1e", fontFamily: SANS,
                    outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#1e4a28")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#dddbd4")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "#6b7c6e",
                    display: "flex", alignItems: "center", padding: 4,
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "#b03a2e", lineHeight: 1.5 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "13px 20px", borderRadius: 8, fontSize: 14, fontWeight: 700,
                backgroundColor: loading || !password.trim() ? "#9cad9f" : "#1e4a28",
                color: "#f7f5f0", border: "none", fontFamily: SANS,
                cursor: loading || !password.trim() ? "not-allowed" : "pointer",
                transition: "background-color 0.15s",
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 16, height: 16, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff", display: "inline-block",
                    animation: "spin 0.7s linear infinite", flexShrink: 0,
                  }} />
                  Signing in…
                </>
              ) : (
                <>Sign in <ArrowRight size={15} /></>
              )}
            </button>
          </form>

        </div>

        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <a href="/" style={{ fontSize: 12, fontWeight: 500, color: "#6b7c6e", letterSpacing: "0.08em", textDecoration: "none" }}>
            &larr; Back to guest view
          </a>
          <p style={{ fontSize: 10, color: "#9cad9f", letterSpacing: "0.06em" }}>
            Developed by Anro Kruger
          </p>
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .hidden { display: none; }
        @media (min-width: 1024px) { .lg\\:flex { display: flex !important; } .lg\\:hidden { display: none !important; } }
      `}</style>
    </div>
  )
}
