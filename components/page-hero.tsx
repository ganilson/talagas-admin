"use client"

import { MaterialIcon } from "@/components/material-icon"
import { cn } from "@/lib/utils"

interface PageHeroProps {
    title: string
    subtitle?: string
    icon: string
    className?: string
}

export function PageHero({ title, subtitle, icon, className }: PageHeroProps) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 p-8 text-white shadow-lg transition-all hover:shadow-xl",
                className
            )}
        >
            <div className="relative z-10 flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl animate-[fadeInUp_0.4s_ease-out]">{title}</h1>
                {subtitle && (
                    <p className="max-w-xl text-lg text-orange-50 opacity-90 animate-[fadeInUp_0.6s_ease-out]">{subtitle}</p>
                )}
            </div>

            {/* Background Icon */}
            <div className="absolute -bottom-6 -right-6 opacity-20 rotate-12 transition-transform duration-500 hover:scale-110 hover:rotate-6">
                <MaterialIcon icon={icon} className="text-[150px] text-white" />
            </div>

            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 h-full w-1/3 bg-white/5 skew-x-12 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-full w-1/3 bg-black/5 -skew-x-12 blur-3xl" />
        </div>
    )
}
