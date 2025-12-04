import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface KeyMetric {
  name: string
  value: string
  status: 'critical' | 'warning' | 'normal' | 'good'
  trend?: 'increasing' | 'decreasing' | 'stable' | 'unknown'
}

interface Alert {
  severity: 'critical' | 'warning' | 'info'
  message: string
}

interface AnalysisData {
  page_title?: string
  primary_purpose?: string
  health_status?: 'critical' | 'warning' | 'healthy' | 'unknown'
  key_metrics?: KeyMetric[]
  alerts?: Alert[]
  charts?: string[]
  critical_issues?: string[]
  key_insights?: string[]
  recommendations?: string[]
  raw_text?: string
}

interface ConsolidatedAnalysis {
  executive_summary: {
    overall_health: 'critical' | 'warning' | 'healthy' | 'unknown'
    key_findings: string[]
    critical_issues: string[]
    recommendations: string[]
  }
}

interface ScreenshotAnalysis {
  screenshotNum: number
  data: AnalysisData
}

export interface FullAnalysisData {
  consolidated?: ConsolidatedAnalysis
  screenshots: ScreenshotAnalysis[]
  timestamp: number
}

/**
 * Generate a beautifully formatted PDF from analysis data
 */
export function generateAnalysisPDF(analysisData: FullAnalysisData): void {
  const doc = new jsPDF()
  let yPosition = 20

  // Color definitions
  const colors = {
    critical: [220, 38, 38] as [number, number, number],
    warning: [234, 179, 8] as [number, number, number],
    healthy: [34, 197, 94] as [number, number, number],
    normal: [100, 116, 139] as [number, number, number],
    good: [34, 197, 94] as [number, number, number],
    info: [59, 130, 246] as [number, number, number],
    unknown: [100, 116, 139] as [number, number, number],
  }

  // Title Page
  doc.setFontSize(24)
  doc.setTextColor(30, 41, 59)
  doc.text('Website Analysis Report', 105, yPosition, { align: 'center' })

  yPosition += 10
  doc.setFontSize(12)
  doc.setTextColor(100, 116, 139)
  const date = new Date(analysisData.timestamp).toLocaleString()
  doc.text(`Generated: ${date}`, 105, yPosition, { align: 'center' })

  yPosition += 5
  doc.text(`Total Screenshots: ${analysisData.screenshots.length}`, 105, yPosition, { align: 'center' })

  // Executive Summary Section
  if (analysisData.consolidated?.executive_summary) {
    doc.addPage()
    yPosition = 20

    doc.setFontSize(18)
    doc.setTextColor(30, 41, 59)
    doc.text('Executive Summary', 14, yPosition)
    yPosition += 10

    const summary = analysisData.consolidated.executive_summary

    // Overall Health
    doc.setFontSize(14)
    doc.text('Overall Health Status:', 14, yPosition)
    const healthColor = (colors[summary.overall_health as keyof typeof colors] || colors.normal) as [number, number, number]
    doc.setTextColor(healthColor[0], healthColor[1], healthColor[2])
    doc.text(summary.overall_health.toUpperCase(), 70, yPosition)
    doc.setTextColor(30, 41, 59)
    yPosition += 10

    // Key Findings
    if (summary.key_findings && summary.key_findings.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Key Findings:', 14, yPosition)
      doc.setFont('helvetica', 'normal')
      yPosition += 7

      summary.key_findings.forEach((finding) => {
        const lines = doc.splitTextToSize(`• ${finding}`, 180)
        lines.forEach((line: string) => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(line, 14, yPosition)
          yPosition += 5
        })
      })
      yPosition += 5
    }

    // Critical Issues
    if (summary.critical_issues && summary.critical_issues.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.critical[0], colors.critical[1], colors.critical[2])
      doc.text('Critical Issues:', 14, yPosition)
      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', 'normal')
      yPosition += 7

      summary.critical_issues.forEach((issue) => {
        const lines = doc.splitTextToSize(`• ${issue}`, 180)
        lines.forEach((line: string) => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(line, 14, yPosition)
          yPosition += 5
        })
      })
      yPosition += 5
    }

    // Recommendations
    if (summary.recommendations && summary.recommendations.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Recommendations:', 14, yPosition)
      doc.setFont('helvetica', 'normal')
      yPosition += 7

      summary.recommendations.forEach((rec) => {
        const lines = doc.splitTextToSize(`• ${rec}`, 180)
        lines.forEach((line: string) => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(line, 14, yPosition)
          yPosition += 5
        })
      })
    }
  }

  // Individual Screenshot Analyses
  analysisData.screenshots.forEach((screenshot) => {
    doc.addPage()
    yPosition = 20

    const data = screenshot.data

    // Screenshot Title
    doc.setFontSize(16)
    doc.setTextColor(30, 41, 59)
    doc.text(`Screenshot ${screenshot.screenshotNum}: ${data.page_title || 'Untitled'}`, 14, yPosition)
    yPosition += 10

    // If raw text, just show it
    if (data.raw_text) {
      doc.setFontSize(10)
      const lines = doc.splitTextToSize(data.raw_text, 180)
      lines.forEach((line: string) => {
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 20
        }
        doc.text(line, 14, yPosition)
        yPosition += 5
      })
      return
    }

    // Primary Purpose
    if (data.primary_purpose) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'italic')
      const purposeLines = doc.splitTextToSize(data.primary_purpose, 180)
      purposeLines.forEach((line: string) => {
        doc.text(line, 14, yPosition)
        yPosition += 5
      })
      doc.setFont('helvetica', 'normal')
      yPosition += 3
    }

    // Health Status
    if (data.health_status) {
      doc.setFontSize(11)
      doc.text('Health Status:', 14, yPosition)
      const healthColor = (colors[data.health_status as keyof typeof colors] || colors.normal) as [number, number, number]
      doc.setTextColor(healthColor[0], healthColor[1], healthColor[2])
      doc.text(data.health_status.toUpperCase(), 50, yPosition)
      doc.setTextColor(30, 41, 59)
      yPosition += 10
    }

    // Critical Issues
    if (data.critical_issues && data.critical_issues.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.critical[0], colors.critical[1], colors.critical[2])
      doc.text('Critical Issues', 14, yPosition)
      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', 'normal')
      yPosition += 7

      data.critical_issues.forEach((issue) => {
        const lines = doc.splitTextToSize(`• ${issue}`, 180)
        lines.forEach((line: string) => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(line, 14, yPosition)
          yPosition += 5
        })
      })
      yPosition += 5
    }

    // Key Metrics Table
    if (data.key_metrics && data.key_metrics.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Key Metrics', 14, yPosition)
      doc.setFont('helvetica', 'normal')
      yPosition += 5

      const tableData = data.key_metrics.map((metric) => [
        metric.name,
        metric.value,
        metric.status.toUpperCase(),
        metric.trend || 'N/A',
      ])

      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value', 'Status', 'Trend']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85] },
        styles: { fontSize: 9 },
        didParseCell: (data) => {
          // Color code the status column
          if (data.column.index === 2 && data.section === 'body') {
            const status = data.cell.text[0].toLowerCase()
            if (status in colors) {
              data.cell.styles.textColor = colors[status as keyof typeof colors]
              data.cell.styles.fontStyle = 'bold'
            }
          }
        },
      })

      yPosition = (doc as any).lastAutoTable.finalY + 10
    }

    // Alerts
    if (data.alerts && data.alerts.length > 0) {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Alerts', 14, yPosition)
      doc.setFont('helvetica', 'normal')
      yPosition += 7

      data.alerts.forEach((alert) => {
        const alertColor = (colors[alert.severity as keyof typeof colors] || colors.info) as [number, number, number]
        doc.setTextColor(alertColor[0], alertColor[1], alertColor[2])
        const lines = doc.splitTextToSize(`• [${alert.severity.toUpperCase()}] ${alert.message}`, 180)
        lines.forEach((line: string) => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(line, 14, yPosition)
          yPosition += 5
        })
        doc.setTextColor(30, 41, 59)
      })
      yPosition += 5
    }

    // Charts Detected
    if (data.charts && data.charts.length > 0) {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Charts Detected', 14, yPosition)
      doc.setFont('helvetica', 'normal')
      yPosition += 7

      data.charts.forEach((chart) => {
        const lines = doc.splitTextToSize(`• ${chart}`, 180)
        lines.forEach((line: string) => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(line, 14, yPosition)
          yPosition += 5
        })
      })
      yPosition += 5
    }

    // Key Insights
    if (data.key_insights && data.key_insights.length > 0) {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Key Insights', 14, yPosition)
      doc.setFont('helvetica', 'normal')
      yPosition += 7

      data.key_insights.forEach((insight) => {
        const lines = doc.splitTextToSize(`• ${insight}`, 180)
        lines.forEach((line: string) => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(line, 14, yPosition)
          yPosition += 5
        })
      })
      yPosition += 5
    }

    // Recommendations
    if (data.recommendations && data.recommendations.length > 0) {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Recommendations', 14, yPosition)
      doc.setFont('helvetica', 'normal')
      yPosition += 7

      data.recommendations.forEach((rec) => {
        const lines = doc.splitTextToSize(`• ${rec}`, 180)
        lines.forEach((line: string) => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(line, 14, yPosition)
          yPosition += 5
        })
      })
    }
  })

  // Save the PDF
  const filename = `website-analysis-${new Date(analysisData.timestamp).toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}
