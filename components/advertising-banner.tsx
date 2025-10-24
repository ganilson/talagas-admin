"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MaterialIcon } from "@/components/material-icon"
import { cn } from "@/lib/utils"

interface BannerProps {
  title: string
  description: string
  imageUrl?: string
  ctaText?: string
  ctaLink?: string
  variant?: "default" | "compact"
  dismissible?: boolean
}

export function AdvertisingBanner({
  title,
  description,
  imageUrl,
  ctaText,
  ctaLink,
  variant = "default",
  dismissible = true,
}: BannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10",
        variant === "compact" && "p-4",
        variant === "default" && "p-6",
      )}
    >
      {dismissible && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8"
          onClick={() => setIsDismissed(true)}
        >
          <MaterialIcon icon="close" className="text-base" />
        </Button>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {imageUrl && (
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg">
            <img src={imageUrl || "/placeholder.svg"} alt={title} className="h-full w-full object-cover" />
          </div>
        )}

        <div className="flex-1 space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {ctaText && ctaLink && (
          <Button asChild className="shrink-0">
            <a href={ctaLink} target="_blank" rel="noopener noreferrer">
              {ctaText}
              <MaterialIcon icon="arrow_forward" className="ml-2" />
            </a>
          </Button>
        )}
      </div>
    </Card>
  )
}
