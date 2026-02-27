"use client"

const AUTH_KEY = "property_nav_auth"
const ADMIN_PASSWORD = "zebula2025"

export function login(password: string): boolean {
  if (password.trim() === ADMIN_PASSWORD) {
    localStorage.setItem(AUTH_KEY, "authenticated")
    return true
  }
  return false
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY)
}

export function isAuthenticated(): boolean {
  try {
    return localStorage.getItem(AUTH_KEY) === "authenticated"
  } catch {
    return false
  }
}
