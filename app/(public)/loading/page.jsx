'use client'

import Loading from "@/components/Loading"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

export default function LoadingPage() {
    const router = useRouter()
    const pollingRef = useRef(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const nextUrl = params.get('nextUrl') || 'orders'
        const orderId = params.get('orderId')

        // No orderId means COD or direct redirect — just navigate immediately
        if (!orderId) {
            router.push(`/${nextUrl}`)
            return
        }

        const POLL_INTERVAL_MS = 2000   // Check every 2 seconds
        const TIMEOUT_MS = 60000        // Give up after 60s and redirect anyway

        const timeoutId = setTimeout(() => {
            // Webhook took too long — redirect anyway for UX; webhook will still fire
            clearInterval(pollingRef.current)
            router.push(`/${nextUrl}`)
        }, TIMEOUT_MS)

        pollingRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/orders/verify-payment?orderId=${encodeURIComponent(orderId)}`)
                if (!res.ok) return // Network hiccup — keep polling

                const { paid } = await res.json()

                if (paid) {
                    // Webhook has confirmed payment — safe to show orders
                    clearInterval(pollingRef.current)
                    clearTimeout(timeoutId)
                    router.push(`/${nextUrl}`)
                }
            } catch {
                // Silent — keep polling on transient errors
            }
        }, POLL_INTERVAL_MS)

        return () => {
            clearInterval(pollingRef.current)
            clearTimeout(timeoutId)
        }
    }, [router])

    return <Loading />
}

