import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { MessageItem } from './MessageItem'
import { TypingIndicator } from './TypingIndicator'
import { GroupedThinkingSection } from './GroupedThinkingSection'
import { GroupedPlanningSection } from './GroupedPlanningSection'
import { GroupedExecutionSection } from './GroupedExecutionSection'
import { ParentCollapsibleWrapper } from './ParentCollapsibleWrapper'
import { AgentActivitySkeleton } from './skeleton/AgentActivitySkeleton'
import { ThinkingSkeleton } from './skeleton/ThinkingSkeleton'
import { PlanningSkeleton } from './skeleton/PlanningSkeleton'
import { ExecutionSkeleton } from './skeleton/ExecutionSkeleton'
import { Button } from '@/sidepanel/components/ui/button'
import { useAutoScroll } from '../hooks/useAutoScroll'
import { useAnalytics } from '../hooks/useAnalytics'
import { cn } from '@/sidepanel/lib/utils'
import { groupMessages } from '../utils/messageGrouping'
import type { Message } from '../stores/chatStore'
import { useSidePanelPortMessaging } from '@/sidepanel/hooks'
import { MessageType } from '@/lib/types/messaging'
import { useChatStore } from '@/sidepanel/stores/chatStore'
import { useTabsStore } from '@/sidepanel/stores/tabsStore'
import { generateAnalysisPDF } from '@/sidepanel/utils/pdfGenerator'
import type { FullAnalysisData } from '@/sidepanel/utils/pdfGenerator'

interface MessageListProps {
  messages: Message[]
  isProcessing?: boolean
  onScrollStateChange?: (isUserScrolling: boolean) => void
  scrollToBottom?: () => void
  containerRef?: React.RefObject<HTMLDivElement>
  isVisionMode?: boolean  // Flag to show dashboard analysis button
}

// Example prompts - showcasing BrowserOS capabilities
const AGENT_EXAMPLES = [
  'Read about our vision',
  'Integrate into AWS',
  'View Investigations',
  'Onboard me',
]

// Animation constants
const DEFAULT_DISPLAY_COUNT = 4 // Fixed number of examples to show

/**
 * MessageList component
 * Displays a list of chat messages with auto-scroll and empty state
 */
export function MessageList({ messages, isProcessing = false, onScrollStateChange, scrollToBottom: externalScrollToBottom, containerRef: externalContainerRef, isVisionMode = false }: MessageListProps) {
  const { containerRef: internalContainerRef, isUserScrolling, scrollToBottom } = useAutoScroll<HTMLDivElement>([messages], externalContainerRef, isProcessing)
  const { trackFeature } = useAnalytics()
  const { sendMessage } = useSidePanelPortMessaging()
  const { upsertMessage, setProcessing } = useChatStore()
  const { getContextTabs, clearSelectedTabs } = useTabsStore()
  const [, setIsAtBottom] = useState(true)
  const currentExamples = useMemo<string[]>(() => AGENT_EXAMPLES, [])
  const [isAnimating] = useState(false)
  const [displayCount] = useState(DEFAULT_DISPLAY_COUNT)

  // Track previously seen message IDs to determine which are new
  const previousMessageIdsRef = useRef<Set<string>>(new Set())
  const newMessageIdsRef = useRef<Set<string>>(new Set())

  // Store latest analysis data for PDF generation
  const [latestAnalysisData, setLatestAnalysisData] = useState<FullAnalysisData | null>(null)

  // Use external container ref if provided, otherwise use internal one
  const containerRef = externalContainerRef || internalContainerRef
  

  // Track new messages for animation 
  useEffect(() => {
    const currentMessageIds = new Set(messages.map(msg => msg.msgId))
    const previousIds = previousMessageIdsRef.current
    
    // Find new messages (in current but not in previous)
    const newIds = new Set<string>()
    currentMessageIds.forEach(id => {
      if (!previousIds.has(id)) {
        newIds.add(id)
      }
    })
    
    newMessageIdsRef.current = newIds
    previousMessageIdsRef.current = currentMessageIds
  }, [messages])

  // Use simplified message grouping for new agent architecture
  const messageGroups = useMemo(() => {
    return groupMessages(messages)
  }, [messages])
  
  // Detect if task is completed (assistant message exists after thinking messages)
  const isTaskCompleted = useMemo(() => {
    return messages.some(msg => msg.role === 'assistant')
  }, [messages])
  
  // Scroll to latest assistant message when task completes
  useEffect(() => {
    if (isTaskCompleted) {
      const latestAssistantMessage = messages.findLast(msg => msg.role === 'assistant')
      if (latestAssistantMessage) {
        // Small delay to let sections collapse first
        setTimeout(() => {
          const messageElement = document.querySelector(`[data-message-id="${latestAssistantMessage.msgId}"]`)
          if (messageElement) {
            messageElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            })
          }
        }, 100) // Minimal delay just for collapse animation
      }
    }
  }, [isTaskCompleted, messages])
  


  // Check if we're at the bottom of the scroll container
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const checkIfAtBottom = () => {
      const scrollDistance = container.scrollHeight - container.scrollTop - container.clientHeight
      const isNearBottom = scrollDistance < 100 // Increased threshold for better detection
      setIsAtBottom(isNearBottom)
      
      const shouldShowScrollButton = !isNearBottom && isUserScrolling
      onScrollStateChange?.(shouldShowScrollButton)
    }

    // Check initially after a small delay to ensure container is rendered
    setTimeout(checkIfAtBottom, 100)

    // Check on scroll
    container.addEventListener('scroll', checkIfAtBottom, { passive: true })
    
    // Also check when messages change
    checkIfAtBottom()
    
    return () => {
      container.removeEventListener('scroll', checkIfAtBottom)
    }
  }, [containerRef, onScrollStateChange, messages.length, isUserScrolling]) // Added isUserScrolling dependency

  // Use external scroll function if provided, otherwise use internal one
  const _handleScrollToBottom = () => {
    trackFeature('scroll_to_bottom')
    if (externalScrollToBottom) {
      externalScrollToBottom()
    } else {
      scrollToBottom()
    }
  }

  const handleExampleClick = (prompt: string) => {
    // Prevent any event propagation that might interfere
    trackFeature('example_prompt', { prompt })

    // Special handling for "Onboard me" workflow
    if (prompt === 'Onboard me') {
      const onboardingWorkflow = `I need you to help me onboard to our cloud service. Please follow these steps carefully:

1. Navigate to https://ravi-dev.ciroos.ai/onboarding-flow
2. Click the "Continue" button
3. Click "Start Cloud Onboarding"
4. Click "Add Cloud Connection"
5. IMPORTANT: Ask me (using human input) to fill out the Role Name and select the Services I want
6. After I provide that information, click "Next"
7. Download the generated CloudFormation template file
8. Open a new tab to: https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/template
9. On the AWS CloudFormation page, click "Upload a template file"
10. Instruct me to upload the template file you just downloaded

Please execute this workflow step by step, using visual tools to interact with the pages and asking for my input when needed.`

      const msgId = `user_${Date.now()}`
      upsertMessage({ msgId, role: 'user', content: 'Onboard me', ts: Date.now() })
      setProcessing(true)

      const contextTabs = getContextTabs()
      const tabIds = contextTabs.length > 0 ? contextTabs.map(tab => tab.id) : undefined

      sendMessage(MessageType.EXECUTE_QUERY, {
        query: onboardingWorkflow,
        tabIds,
        source: 'sidepanel',
        chatMode: false
      })

      try { clearSelectedTabs() } catch { /* no-op */ }
      return
    }

    // Normal example prompt handling
    const msgId = `user_${Date.now()}`
    upsertMessage({ msgId, role: 'user', content: prompt, ts: Date.now() })
    setProcessing(true)

    // Collect selected context tabs (same behavior as ChatInput)
    const contextTabs = getContextTabs()
    const tabIds = contextTabs.length > 0 ? contextTabs.map(tab => tab.id) : undefined

    sendMessage(MessageType.EXECUTE_QUERY, {
      query: prompt.trim(),
      tabIds,
      source: 'sidepanel',
      chatMode: false
    })

    // Clear selected tabs after sending (mirror ChatInput)
    try { clearSelectedTabs() } catch { /* no-op */ }
  }

  const analyzeDashboardWithGemini = async (screenshots: string[], websiteUrl: string) => {
    const analysisMsgId = `assistant_${Date.now()}`

    try {
      upsertMessage({
        msgId: analysisMsgId,
        role: 'assistant',
        content: ` Analyzing website with Gemini 2.5 Pro...\n\nProcessing ${screenshots.length} screenshots...`,
        ts: Date.now()
      })

      // Get API key from chrome.storage
      const apiKeyResult = await chrome.storage.local.get('gemini-vision-api-key')
      const apiKey = apiKeyResult['gemini-vision-api-key']

      if (!apiKey) {
        upsertMessage({
          msgId: analysisMsgId,
          role: 'assistant',
          content: `Gemini API key not found. Please add your API key in extension settings.\n\nFor now, showing captured screenshots only.`,
          ts: Date.now()
        })
        return
      }

      const analysisResults = []

      // Analyze each screenshot with Gemini (with rate limiting delay)
      for (let i = 0; i < screenshots.length; i++) {
        upsertMessage({
          msgId: analysisMsgId,
          role: 'assistant',
          content: `Analyzing screenshot ${i + 1}/${screenshots.length}...`,
          ts: Date.now()
        })

        const base64Image = screenshots[i].split(',')[1]

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    inline_data: {
                      mime_type: 'image/png',
                      data: base64Image
                    }
                  },
                  {
                    text: `Analyze this website/dashboard screenshot and return a structured JSON response.

Extract ONLY the key information - be concise and factual. Focus on actionable insights, not descriptions.

Return a JSON object with this exact structure:
{
  "page_title": "string - the page or dashboard title",
  "primary_purpose": "string - one sentence explaining what this page is for",
  "health_status": "critical" | "warning" | "healthy" | "unknown",
  "key_metrics": [
    {
      "name": "string - metric name",
      "value": "string - value with unit (e.g., '85%')",
      "status": "critical" | "warning" | "normal" | "good",
      "trend": "increasing" | "decreasing" | "stable" | "unknown"
    }
  ],
  "alerts": [
    {
      "severity": "critical" | "warning" | "info",
      "title": "string - short alert title",
      "description": "string - what it means"
    }
  ],
  "charts": [
    {
      "title": "string - chart title",
      "type": "line" | "bar" | "pie" | "gauge" | "area",
      "key_insight": "string - ONE sentence takeaway",
      "trend": "increasing" | "decreasing" | "stable" | "spike" | "drop"
    }
  ],
  "critical_issues": [
    "string - critical problem requiring immediate attention"
  ],
  "key_insights": [
    "string - important insight about system health or performance"
  ],
  "recommendations": [
    "string - actionable recommendation"
  ]
}

Rules:
- Extract max 6 key_metrics (most important only)
- Extract max 5 charts (most important only)
- Max 3 critical_issues
- Max 3 key_insights
- Max 3 recommendations
- Use exact text/values from the screenshot
- Be specific with numbers
- Focus on actionable information, not descriptions

Return ONLY valid JSON, no other text.`
                  }
                ]
              }]
            })
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Gemini API error: ${response.status} ${errorText}`)
        }

        const result = await response.json()
        let analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis generated'

        // Try to parse as JSON, fallback to text if it fails
        let analysisData
        try {
          // Remove markdown code blocks if present
          analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          analysisData = JSON.parse(analysisText)
        } catch (e) {
          console.warn('Failed to parse JSON response, using text fallback:', e)
          analysisData = { raw_text: analysisText }
        }

        analysisResults.push({
          screenshot: i + 1,
          data: analysisData
        })

        // Rate limiting: Wait 5 seconds between API calls (except after last one)
        if (i < screenshots.length - 1) {
          upsertMessage({
            msgId: analysisMsgId,
            role: 'assistant',
            content: `Waiting 5 seconds before next analysis...`,
            ts: Date.now()
          })
          await new Promise(resolve => setTimeout(resolve, 5000))
        }
      }

      // Stage 2: Generate consolidated executive summary
      upsertMessage({
        msgId: analysisMsgId,
        role: 'assistant',
        content: `Generating consolidated analysis across all screenshots...`,
        ts: Date.now()
      })

      // Prepare summary of all analyses for consolidation
      const allAnalysesText = analysisResults.map((result, idx) => {
        return `Screenshot ${idx + 1}:\n${JSON.stringify(result.data, null, 2)}`
      }).join('\n\n')

      // Call Gemini again to consolidate
      let consolidatedSummary
      try {
        const consolidatedResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `You are analyzing a website with ${screenshots.length} screenshots. Below are the individual analyses for each screenshot.

INDIVIDUAL SCREENSHOT ANALYSES:
${allAnalysesText}

Generate a CONSOLIDATED EXECUTIVE SUMMARY that synthesizes insights across ALL screenshots. Return JSON with this structure:

{
  "overall_health_status": "critical" | "warning" | "healthy" | "unknown",
  "executive_summary": "2-3 sentences summarizing the entire website/dashboard",
  "top_critical_issues": [
    "Most critical issue across all pages (max 3)"
  ],
  "key_metrics_summary": [
    {
      "name": "Metric name",
      "overall_status": "critical" | "warning" | "good",
      "trend": "improving" | "degrading" | "stable",
      "note": "Brief note about this metric across pages"
    }
  ],
  "consolidated_insights": [
    "Key insight combining information from multiple screenshots (max 5)"
  ],
  "top_recommendations": [
    "Prioritized action items based on all data (max 3)"
  ]
}

Rules:
- Synthesize, don't repeat individual screenshot details
- Focus on patterns and trends across ALL screenshots
- Prioritize the most critical information
- Be concise and actionable
- Max 3 critical issues, 5 insights, 3 recommendations

Return ONLY valid JSON, no other text.`
                }]
              }]
            })
          }
        )

        if (consolidatedResponse.ok) {
          const consolidatedResult = await consolidatedResponse.json()
          let consolidatedText = consolidatedResult.candidates?.[0]?.content?.parts?.[0]?.text || '{}'

          // Parse JSON
          consolidatedText = consolidatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          consolidatedSummary = JSON.parse(consolidatedText)
        } else {
          console.warn('Consolidated analysis failed, skipping')
          consolidatedSummary = null
        }
      } catch (e) {
        console.warn('Failed to generate consolidated summary:', e)
        consolidatedSummary = null
      }

      // Combine all analyses into final report
      let finalReport = `# 📊 Quick Analysis Results\n\n`
      finalReport += `**URL**: ${websiteUrl}\n`
      finalReport += `**Screenshots Analyzed**: ${screenshots.length}\n`
      finalReport += `**Analyzed**: ${new Date().toLocaleString()}\n\n`
      finalReport += `---\n\n`

      // Add consolidated executive summary at the top (if available)
      if (consolidatedSummary) {
        const healthEmoji: Record<string, string> = {
          critical: '🚨',
          warning: '⚠️',
          healthy: '✅',
          unknown: '❔'
        }

        finalReport += `## 📋 Executive Summary\n\n`
        finalReport += `**Overall Status**: ${healthEmoji[consolidatedSummary.overall_health_status] || '❔'} ${consolidatedSummary.overall_health_status?.toUpperCase() || 'UNKNOWN'}\n\n`
        finalReport += `${consolidatedSummary.executive_summary || 'No summary available'}\n\n`

        // Top Critical Issues
        if (consolidatedSummary.top_critical_issues && consolidatedSummary.top_critical_issues.length > 0) {
          finalReport += `### 🚨 Top Critical Issues\n\n`
          consolidatedSummary.top_critical_issues.forEach((issue: string, idx: number) => {
            finalReport += `${idx + 1}. ${issue}\n`
          })
          finalReport += `\n`
        }

        // Key Metrics Summary
        if (consolidatedSummary.key_metrics_summary && consolidatedSummary.key_metrics_summary.length > 0) {
          finalReport += `### 📊 Key Metrics Overview\n\n`
          finalReport += `| Metric | Status | Trend | Note |\n`
          finalReport += `|--------|--------|-------|------|\n`
          consolidatedSummary.key_metrics_summary.forEach((metric: any) => {
            const statusEmoji: Record<string, string> = {
              critical: '🚨',
              warning: '⚠️',
              good: '✅',
              unknown: '❔'
            }
            const trendEmoji: Record<string, string> = {
              improving: '↗️',
              degrading: '↘️',
              stable: '→',
              unknown: '❔'
            }
            finalReport += `| ${metric.name} | ${statusEmoji[metric.overall_status] || '❔'} ${metric.overall_status} | ${trendEmoji[metric.trend] || '❔'} ${metric.trend} | ${metric.note || '-'} |\n`
          })
          finalReport += `\n`
        }

        // Consolidated Insights
        if (consolidatedSummary.consolidated_insights && consolidatedSummary.consolidated_insights.length > 0) {
          finalReport += `### 💡 Key Insights\n\n`
          consolidatedSummary.consolidated_insights.forEach((insight: string, idx: number) => {
            finalReport += `${idx + 1}. ${insight}\n`
          })
          finalReport += `\n`
        }

        // Top Recommendations
        if (consolidatedSummary.top_recommendations && consolidatedSummary.top_recommendations.length > 0) {
          finalReport += `### ✅ Recommended Actions\n\n`
          consolidatedSummary.top_recommendations.forEach((rec: string, idx: number) => {
            finalReport += `${idx + 1}. ${rec}\n`
          })
          finalReport += `\n`
        }

        finalReport += `---\n\n`
        finalReport += `## 📸 Individual Screenshot Details\n\n`
        finalReport += `*Expand below for detailed analysis of each screenshot*\n\n`
        finalReport += `---\n\n`
      }

      // Helper function to format structured analysis as beautiful markdown
      const formatStructuredAnalysis = (data: any, screenshotNum: number) => {
        // Fallback for raw text (if JSON parsing failed)
        if (data.raw_text) {
          return `### Screenshot ${screenshotNum}\n\n${data.raw_text}\n\n`
        }

        let markdown = `### Screenshot ${screenshotNum}: ${data.page_title || 'Untitled'}\n\n`

        // Health status badge
        const healthEmoji: Record<string, string> = {
          critical: '🚨',
          warning: '⚠️',
          healthy: '✅',
          unknown: '❔'
        }
        markdown += `**Status**: ${healthEmoji[data.health_status] || '❔'} ${data.health_status?.toUpperCase() || 'UNKNOWN'}\n\n`

        if (data.primary_purpose) {
          markdown += `**Purpose**: ${data.primary_purpose}\n\n`
        }

        // Critical Issues (most important - show first)
        if (data.critical_issues && data.critical_issues.length > 0) {
          markdown += `#### 🚨 Critical Issues\n\n`
          data.critical_issues.forEach((issue: string) => {
            markdown += `- ${issue}\n`
          })
          markdown += `\n`
        }

        // Alerts
        if (data.alerts && data.alerts.length > 0) {
          markdown += `#### ⚠️ Alerts\n\n`
          data.alerts.forEach((alert: any) => {
            const severityEmoji: Record<string, string> = { critical: '🚨', warning: '⚠️', info: 'ℹ️' }
            markdown += `**${severityEmoji[alert.severity] || ''} ${alert.title}**\n`
            markdown += `${alert.description}\n\n`
          })
        }

        // Key Metrics (formatted as table)
        if (data.key_metrics && data.key_metrics.length > 0) {
          markdown += `#### 📊 Key Metrics\n\n`
          markdown += `| Metric | Value | Status | Trend |\n`
          markdown += `|--------|-------|--------|-------|\n`
          data.key_metrics.forEach((metric: any) => {
            const statusEmoji: Record<string, string> = {
              critical: '🚨',
              warning: '⚠️',
              normal: '➖',
              good: '✅'
            }
            const trendEmoji: Record<string, string> = {
              increasing: '↗️',
              decreasing: '↘️',
              stable: '→',
              unknown: '❔'
            }
            markdown += `| ${metric.name} | **${metric.value}** | ${statusEmoji[metric.status] || '❔'} ${metric.status} | ${trendEmoji[metric.trend] || '❔'} |\n`
          })
          markdown += `\n`
        }

        // Charts
        if (data.charts && data.charts.length > 0) {
          markdown += `#### 📈 Charts Analyzed (${data.charts.length})\n\n`
          data.charts.forEach((chart: any) => {
            const trendEmoji: Record<string, string> = {
              increasing: '↗️',
              decreasing: '↘️',
              stable: '→',
              spike: '⚡',
              drop: '⬇️'
            }
            markdown += `**${chart.title}** (${chart.type})\n`
            markdown += `${trendEmoji[chart.trend] || ''} ${chart.key_insight}\n\n`
          })
        }

        // Key Insights
        if (data.key_insights && data.key_insights.length > 0) {
          markdown += `#### 💡 Key Insights\n\n`
          data.key_insights.forEach((insight: string, idx: number) => {
            markdown += `${idx + 1}. ${insight}\n`
          })
          markdown += `\n`
        }

        // Recommendations
        if (data.recommendations && data.recommendations.length > 0) {
          markdown += `#### ✅ Recommendations\n\n`
          data.recommendations.forEach((rec: string, idx: number) => {
            markdown += `${idx + 1}. ${rec}\n`
          })
          markdown += `\n`
        }

        return markdown
      }

      analysisResults.forEach((result) => {
        finalReport += formatStructuredAnalysis(result.data, result.screenshot)
        finalReport += `---\n\n`
      })

      // Store analysis data for PDF generation
      const timestamp = Date.now()
      const analysisDataForPDF: FullAnalysisData = {
        consolidated: consolidatedSummary ? {
          executive_summary: {
            overall_health: consolidatedSummary.overall_health_status || 'unknown',
            key_findings: consolidatedSummary.consolidated_insights || [],
            critical_issues: consolidatedSummary.top_critical_issues || [],
            recommendations: consolidatedSummary.top_recommendations || []
          }
        } : undefined,
        screenshots: analysisResults.map(result => ({
          screenshotNum: result.screenshot,
          data: result.data
        })),
        timestamp
      }
      setLatestAnalysisData(analysisDataForPDF)

      upsertMessage({
        msgId: analysisMsgId,
        role: 'assistant',
        content: finalReport,
        ts: Date.now()
      })

    } catch (error) {
      console.error('Gemini analysis error:', error)
      upsertMessage({
        msgId: analysisMsgId,
        role: 'assistant',
        content: `❌ Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your API key and try again.`,
        ts: Date.now()
      })
    }
  }

  const handleDashboardAnalysis = async () => {
    trackFeature('quick_analysis')

    // Prompt user for website URL
    const websiteUrl = prompt('Please provide the website URL you want to analyze:')
    if (!websiteUrl || !websiteUrl.trim()) {
      return
    }

    const msgId = `user_${Date.now()}`
    upsertMessage({ msgId, role: 'user', content: `Quick Analysis: ${websiteUrl}`, ts: Date.now() })
    setProcessing(true)

    try {
      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const currentTab = tabs[0]

      if (!currentTab?.id || !currentTab.windowId) {
        throw new Error('No active tab found')
      }

      // Add status message
      const statusMsgId = `assistant_${Date.now()}`
      upsertMessage({
        msgId: statusMsgId,
        role: 'assistant',
        content: `Navigating to website...`,
        ts: Date.now()
      })

      // Navigate to website
      await chrome.tabs.update(currentTab.id, { url: websiteUrl.trim() })

      // Wait for page to load
      await new Promise<void>((resolve) => {
        const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
          if (tabId === currentTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener)
            resolve()
          }
        }
        chrome.tabs.onUpdated.addListener(listener)

        // Timeout after 30 seconds
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener)
          resolve()
        }, 30000)
      })

      // Update status
      upsertMessage({
        msgId: statusMsgId,
        role: 'assistant',
        content: `Page loaded! Scrolling through the page...`,
        ts: Date.now()
      })

      // Small delay after load
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Get page dimensions for scroll calculation
      const [pageInfo] = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: () => {
          const pageHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
          )
          const viewportHeight = window.innerHeight
          return {
            pageHeight,
            viewportHeight,
            scrollSteps: Math.ceil(pageHeight / viewportHeight)
          }
        }
      })

      const { scrollSteps } = pageInfo.result || { scrollSteps: 1 }
      const screenshots: string[] = []

      upsertMessage({
        msgId: statusMsgId,
        role: 'assistant',
        content: `Page loaded! Capturing ${scrollSteps} screenshots while scrolling...`,
        ts: Date.now()
      })

      // Scroll to top first
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: () => {
          window.scrollTo(0, 0)
        }
      })
      await new Promise(resolve => setTimeout(resolve, 500))

      // Capture screenshots at each scroll position
      for (let i = 0; i < scrollSteps; i++) {
        // Capture screenshot at current position
        const dataUrl = await chrome.tabs.captureVisibleTab(currentTab.windowId, {
          format: 'png'
        })
        screenshots.push(dataUrl)

        // Update progress
        upsertMessage({
          msgId: statusMsgId,
          role: 'assistant',
          content: `Capturing screenshots... ${i + 1}/${scrollSteps}`,
          ts: Date.now()
        })

        // Scroll down one viewport (except on last iteration)
        if (i < scrollSteps - 1) {
          await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: (step: number) => {
              window.scrollTo(0, step * window.innerHeight)
            },
            args: [i + 1]
          })
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // Store screenshots in chrome.storage for analysis
      await chrome.storage.local.set({
        'vision-screenshots': {
          url: websiteUrl,
          timestamp: Date.now(),
          screenshots: screenshots,
          count: screenshots.length
        }
      })

      // Add success message with analyze button
      upsertMessage({
        msgId: statusMsgId,
        role: 'assistant',
        content: `✓ Website captured!\n\n• URL: ${websiteUrl}\n• Screenshots: ${screenshots.length} captured\n• Total size: ${Math.round(screenshots.reduce((sum, s) => sum + s.length, 0) / 1024 / 1024 * 100) / 100} MB\n\nReady to analyze with Gemini 2.5 Pro.`,
        ts: Date.now()
      })

      // Start analysis automatically
      await analyzeDashboardWithGemini(screenshots, websiteUrl)
    } catch (error) {
      console.error('Dashboard analysis error:', error)
      const errorMsgId = `assistant_${Date.now()}`
      upsertMessage({
        msgId: errorMsgId,
        role: 'assistant',
        content: `Failed to analyze website: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ts: Date.now()
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleFullAnalysis = async () => {
    trackFeature('full_analysis')

    // Prompt user for website URL
    const websiteUrl = prompt('Please provide the website URL you want to analyze:')
    if (!websiteUrl || !websiteUrl.trim()) {
      return
    }

    const msgId = `user_${Date.now()}`
    upsertMessage({ msgId, role: 'user', content: `Full Analysis: ${websiteUrl}`, ts: Date.now() })
    setProcessing(true)

    try {
      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const currentTab = tabs[0]

      if (!currentTab?.id || !currentTab.windowId) {
        throw new Error('No active tab found')
      }

      // Add status message
      const statusMsgId = `assistant_${Date.now()}`
      upsertMessage({
        msgId: statusMsgId,
        role: 'assistant',
        content: `Navigating to website...`,
        ts: Date.now()
      })

      // Navigate to website
      await chrome.tabs.update(currentTab.id, { url: websiteUrl.trim() })

      // Wait for page to load
      await new Promise<void>((resolve) => {
        const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
          if (tabId === currentTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener)
            resolve()
          }
        }
        chrome.tabs.onUpdated.addListener(listener)

        // Timeout after 30 seconds
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener)
          resolve()
        }, 30000)
      })

      // Update status
      upsertMessage({
        msgId: statusMsgId,
        role: 'assistant',
        content: `Page loaded! Capturing screenshot...`,
        ts: Date.now()
      })

      // Small delay after load
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Capture a single screenshot
      const screenshot = await chrome.tabs.captureVisibleTab(currentTab.windowId, {
        format: 'png'
      })

      upsertMessage({
        msgId: statusMsgId,
        role: 'assistant',
        content: `Screenshot captured! Calling Vision Analysis API...`,
        ts: Date.now()
      })

      // Call Flask API
      const response = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          screenshots: [screenshot]
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} ${errorText}`)
      }

      const result = await response.json()

      // Format the structured analysis
      const analysis = result.analysis
      let formattedContent = `# ✅ Full Analysis Complete!\n\n`
      formattedContent += `**URL**: ${websiteUrl}\n`
      formattedContent += `**Screenshots Analyzed**: ${result.screenshots_analyzed}\n\n`

      if (analysis.error) {
        formattedContent += `⚠️ ${analysis.error}\n\n`
        if (analysis.ocr_text) {
          formattedContent += `**OCR Text**: ${analysis.ocr_text.substring(0, 500)}...\n`
        }
      } else {
        // Page Title and Purpose
        formattedContent += `## 📄 ${analysis.page_title || 'Untitled Page'}\n\n`
        if (analysis.primary_purpose) {
          formattedContent += `*${analysis.primary_purpose}*\n\n`
        }

        // Health Status
        const healthEmoji: Record<string, string> = {
          healthy: '✅',
          warning: '⚠️',
          critical: '🚨',
          unknown: '❔'
        }
        formattedContent += `**Overall Health**: ${healthEmoji[analysis.health_status] || '❔'} ${analysis.health_status?.toUpperCase() || 'UNKNOWN'}\n\n`

        // Critical Issues
        if (analysis.critical_issues && analysis.critical_issues.length > 0) {
          formattedContent += `### 🚨 Critical Issues\n\n`
          analysis.critical_issues.forEach((issue: string) => {
            formattedContent += `- ${issue}\n`
          })
          formattedContent += `\n`
        }

        // Key Metrics
        if (analysis.key_metrics && analysis.key_metrics.length > 0) {
          formattedContent += `### 📊 Key Metrics\n\n`
          formattedContent += `| Metric | Value | Status | Trend |\n`
          formattedContent += `|--------|-------|--------|-------|\n`
          analysis.key_metrics.forEach((metric: any) => {
            const statusEmoji: Record<string, string> = {
              good: '✅',
              warning: '⚠️',
              critical: '🚨',
              normal: '➖'
            }
            const trendEmoji: Record<string, string> = {
              increasing: '↗️',
              decreasing: '↘️',
              stable: '→',
              unknown: '❔'
            }
            formattedContent += `| ${metric.name} | **${metric.value}** | ${statusEmoji[metric.status] || '➖'} ${metric.status} | ${trendEmoji[metric.trend] || '❔'} |\n`
          })
          formattedContent += `\n`
        }

        // Alerts
        if (analysis.alerts && analysis.alerts.length > 0) {
          formattedContent += `### ⚠️ Alerts\n\n`
          analysis.alerts.forEach((alert: any) => {
            const severityEmoji: Record<string, string> = {
              critical: '🚨',
              warning: '⚠️',
              info: 'ℹ️'
            }
            formattedContent += `**${severityEmoji[alert.severity] || 'ℹ️'} ${alert.severity.toUpperCase()}**: ${alert.message}\n\n`
          })
        }

        // Charts
        if (analysis.charts && analysis.charts.length > 0) {
          formattedContent += `### 📈 Charts Detected\n\n`
          analysis.charts.forEach((chart: string) => {
            formattedContent += `- ${chart}\n`
          })
          formattedContent += `\n`
        }

        // Key Insights
        if (analysis.key_insights && analysis.key_insights.length > 0) {
          formattedContent += `### 💡 Key Insights\n\n`
          analysis.key_insights.forEach((insight: string, idx: number) => {
            formattedContent += `${idx + 1}. ${insight}\n`
          })
          formattedContent += `\n`
        }

        // Recommendations
        if (analysis.recommendations && analysis.recommendations.length > 0) {
          formattedContent += `### ✅ Recommendations\n\n`
          analysis.recommendations.forEach((rec: string, idx: number) => {
            formattedContent += `${idx + 1}. ${rec}\n`
          })
          formattedContent += `\n`
        }
      }

      // Pipeline info
      if (result.pipeline) {
        formattedContent += `\n---\n\n`
        formattedContent += `**Pipeline Details**:\n`
        formattedContent += `- OCR Elements: ${result.pipeline.ocr_elements}\n`
        formattedContent += `- OCR Text Length: ${result.pipeline.ocr_text_length} chars\n`
        formattedContent += `- VLM Response: ${result.pipeline.vlm_response_length} chars\n`
      }

      // Display result
      upsertMessage({
        msgId: statusMsgId,
        role: 'assistant',
        content: formattedContent,
        ts: Date.now()
      })

    } catch (error) {
      console.error('Full analysis error:', error)
      const errorMsgId = `assistant_${Date.now()}`
      upsertMessage({
        msgId: errorMsgId,
        role: 'assistant',
        content: `❌ Full analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n**Troubleshooting**:\n- Make sure Flask API is running: \`python packages/vision-analysis-mcp/server.py\`\n- Check that it's accessible at http://localhost:5000`,
        ts: Date.now()
      })
    } finally {
      setProcessing(false)
    }
  }

  // Landing View
  if (messages.length === 0) {
    return (
      <div 
        className="h-full overflow-y-auto flex flex-col items-center justify-center p-8 text-center relative"
        role="region"
        aria-label="Welcome screen with example prompts"
      >
        {/* Main content - vertically centered (Examples remain centered) */}
        <div className="relative z-0 flex flex-col items-center justify-center min-h-0 max-w-lg w-full">
          
          {/* Tagline */}
          <div className="flex flex-col items-center justify-center -mt-4">
            <h2 className="text-3xl font-bold text-muted-foreground text-center px-2 leading-tight">
              <div className="flex items-center justify-center gap-2">
                <span>Your</span>
                <span className="text-brand">Agentic</span>
              </div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span>assistant</span>
                <img
                  src="/assets/logo-circle (1).svg"
                  alt="BrowserOS"
                  className="w-8 h-8 inline-block align-middle"
                />
              </div>
            </h2>
          </div>

          {/* Action Buttons - Vision Mode shows Analysis buttons, Agent Mode shows examples */}
          <div className="mb-8 mt-2">
            <h3 className="text-lg font-semibold text-foreground mb-6">
              What would you like to do?
            </h3>
            {isVisionMode ? (
              // Analysis Buttons for Vision Mode
              <div className="flex flex-col items-center max-w-lg w-full space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="group relative text-sm h-auto min-h-[48px] py-3 px-4 whitespace-normal bg-background/50 backdrop-blur-sm border-2 border-brand/30 hover:border-brand hover:bg-brand/5 smooth-hover smooth-transform hover:scale-105 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none overflow-hidden w-full message-enter"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleDashboardAnalysis()
                  }}
                  aria-label="Start quick analysis"
                >
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-brand/0 via-brand/5 to-brand/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                  {/* Content */}
                  <span className="relative z-10 font-medium text-foreground group-hover:text-brand transition-colors duration-300">
                    Quick Analysis
                  </span>

                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-brand/20 to-transparent"></div>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="group relative text-sm h-auto min-h-[48px] py-3 px-4 whitespace-normal bg-background/50 backdrop-blur-sm border-2 border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/5 smooth-hover smooth-transform hover:scale-105 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none overflow-hidden w-full message-enter"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleFullAnalysis()
                  }}
                  aria-label="Start full analysis"
                >
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                  {/* Content */}
                  <span className="relative z-10 font-medium text-foreground group-hover:text-purple-500 transition-colors duration-300">
                    Full Analysis
                  </span>

                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-purple-500/20 to-transparent"></div>
                </Button>
              </div>
            ) : (
              // Example Prompts for Agent Mode
              <div
                className={`flex flex-col items-center max-w-lg w-full space-y-3 transition-transform duration-500 ease-in-out ${
                  isAnimating ? 'translate-y-5' : ''
                }`}
                role="group"
                aria-label="Example prompts"
              >
                {currentExamples.map((prompt, index) => (
                  <div
                    key={`${prompt}-${index}`}
                    className={`relative w-full transition-all duration-500 ease-in-out ${
                      isAnimating && index === 0 ? 'animate-fly-in-top' :
                      isAnimating && index === currentExamples.length - 1 ? 'animate-fly-out-bottom' : ''
                    }`}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="group relative text-sm h-auto min-h-[48px] py-3 px-4 whitespace-normal bg-background/50 backdrop-blur-sm border-2 border-brand/30 hover:border-brand hover:bg-brand/5 smooth-hover smooth-transform hover:scale-105 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none overflow-hidden w-full message-enter"
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleExampleClick(prompt)
                      }}
                      aria-label={`Use example: ${prompt}`}
                    >
                      {/* Animated background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-brand/0 via-brand/5 to-brand/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                      {/* Content */}
                      <span className="relative z-10 font-medium text-foreground group-hover:text-brand transition-colors duration-300">
                        {prompt}
                      </span>

                      {/* Glow effect */}
                      <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-brand/20 to-transparent"></div>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  // Chat View
  return (
    <div className="h-full flex flex-col">
      
      {/* Messages container */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden bg-[hsl(var(--background))]"
        ref={containerRef}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        tabIndex={0}
      >
        {/* Messages List */}
        <div className="p-6 space-y-3 pb-4">
          {/* Simplified rendering for new agent architecture */}
          {messageGroups.map((group, groupIndex) => {
            const key = `group-${groupIndex}`
            
            if (group.type === 'thinking') {
              // Render thinking section directly - no complex wrapper needed
              return (
                <GroupedThinkingSection
                  key={key}
                  messages={group.messages}
                  isLatest={groupIndex === messageGroups.length - 1}
                  isTaskCompleted={isTaskCompleted}
                />
              )
            } else {
              // Single message (user, assistant, error, etc.)
              const message = group.messages[0]
              if (!message) return null
              
              const isNewMessage = newMessageIdsRef.current.has(message.msgId)
              
              return (
                <div
                  key={message.msgId}
                  data-message-id={message.msgId}
                  className={isNewMessage ? 'animate-fade-in' : ''}
                  style={{ animationDelay: isNewMessage ? '0.1s' : undefined }}
                >
                  <MessageItem 
                    message={message} 
                    shouldIndent={false}
                    showLocalIndentLine={false}
                  />
                </div>
              )
            }
          })}
          
          
          {/* Show skeleton during processing - either initially or during delays */}
          {isProcessing && (
            <ThinkingSkeleton />
          )}

          {/* Download PDF button for Vision Mode - shows after analysis is complete */}
          {isVisionMode && latestAnalysisData && !isProcessing && (
            <div className="flex justify-center mt-6 pb-4">
              <Button
                type="button"
                variant="outline"
                className="group relative text-sm h-auto py-3 px-6 bg-background/50 backdrop-blur-sm border-2 border-green-500/30 hover:border-green-500 hover:bg-green-500/5 smooth-hover smooth-transform hover:scale-105 hover:shadow-lg focus-visible:outline-none overflow-hidden"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault()
                  e.stopPropagation()
                  trackFeature('download_pdf')
                  generateAnalysisPDF(latestAnalysisData)
                }}
                aria-label="Download analysis as PDF"
              >
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/5 to-green-500/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                {/* Content */}
                <span className="relative z-10 font-medium text-foreground group-hover:text-green-500 transition-colors duration-300">
                  📄 Download PDF Report
                </span>

                {/* Glow effect */}
                <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-green-500/20 to-transparent"></div>
              </Button>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
