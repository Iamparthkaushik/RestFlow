import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const cleanEmptyStrings = <T extends Record<string, any>>(obj: T): T => {
  const result = { ...obj }

  for (const key of Object.keys(result) as (keyof T)[]) {
    const value = result[key]
    if (typeof value === "string" && value.trim() === "") {
      result[key] = undefined as any
    }
  }

  return result
}

export const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}
