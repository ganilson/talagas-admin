"use client"

import { useEffect, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import NProgress from "nprogress"
import "nprogress/nprogress.css"

// Configure NProgress
NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.1 })

function ProgressBar() {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        NProgress.done()
        return () => {
            NProgress.start()
        }
    }, [pathname, searchParams])

    return null
}

export function GlobalProgressBar() {
    return (
        <Suspense fallback={null}>
            <ProgressBar />
        </Suspense>
    )
}
