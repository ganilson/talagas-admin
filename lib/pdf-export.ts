export async function exportToPDF(elementId: string, filename: string) {
  // Dynamic import to avoid SSR issues
  const html2canvas = (await import("html2canvas")).default
  const jsPDF = (await import("jspdf")).default

  const element = document.getElementById(elementId)
  if (!element) return

  const canvas = await html2canvas(element, {
    scale: 2,
    logging: false,
    useCORS: true,
  })

  const imgData = canvas.toDataURL("image/png")
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const imgWidth = 210
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
  pdf.save(filename)
}
