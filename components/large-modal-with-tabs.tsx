"use client"

import { useState, type ReactNode } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MaterialIcon } from "@/components/material-icon"
import { cn } from "@/lib/utils"

interface Tab {
  id: string
  label: string
  icon?: string
  content: ReactNode
}

interface LargeModalWithTabsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  tabs: Tab[]
  onSave: () => void | Promise<void>
  onCancel?: () => void
  saveLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  errors?: Record<string, string>
}

export function LargeModalWithTabs({
  open,
  onOpenChange,
  title,
  description,
  tabs,
  onSave,
  onCancel,
  saveLabel = "Salvar",
  cancelLabel = "Cancelar",
  isLoading = false,
  errors = {},
}: LargeModalWithTabsProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || "")

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onOpenChange(false)
  }

  const handleSave = async () => {
    await onSave()
  }

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent
        className="max-h-[90vh] max-w-4xl overflow-hidden p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* Tabs Navigation */}
        <div className="border-b px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.icon && <MaterialIcon icon={tab.icon} className="text-lg" />}
                {tab.label}
                {errors[tab.id] && (
                  <span className="flex h-2 w-2 rounded-full bg-destructive" title="Erros nesta aba" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-h-[calc(90vh-200px)] overflow-y-auto px-6 py-4">
          <div className="animate-in fade-in-50 duration-200">{activeTabContent}</div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <MaterialIcon icon="progress_activity" className="mr-2 animate-spin" />}
            {saveLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
