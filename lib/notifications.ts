export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.log("Este navegador não suporta notificações")
    return false
  }

  if (Notification.permission === "granted") {
    console.log("✅ Permissão para notificações já concedida")
    return true
  }

  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission()
      const granted = permission === "granted"
      console.log(granted ? "✅ Permissão concedida" : "❌ Permissão negada")
      return granted
    } catch (err) {
      console.error("Erro ao solicitar permissão:", err)
      return false
    }
  }

  console.log("❌ Permissão para notificações negada pelo usuário")
  return false
}

export function isNotificationSupported(): boolean {
  return "Notification" in window && Notification.permission === "granted"
}

export function showNotification(title: string, options?: NotificationOptions): void {
  if (isNotificationSupported()) {
    try {
      new Notification(title, {
        icon: "/simbolo.png",
        badge: "/simbolo.png",
        ...options,
      })
    } catch (err) {
      console.warn("Erro ao mostrar notificação:", err)
    }
  }
}
