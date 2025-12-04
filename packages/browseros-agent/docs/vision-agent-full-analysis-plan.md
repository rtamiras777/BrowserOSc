# Vision Agent: Full Analysis Integration Plan

**Created**: 2025-12-04
**Status**: Planning Phase
**Target**: Phase 2/3 Integration

---

## Table of Contents

1. [Current State](#current-state)
2. [Vision Agent Background](#vision-agent-background)
3. [Architecture Options](#architecture-options)
4. [Flask API Design](#flask-api-design)
5. [BrowserOS Integration](#browseros-integration)
6. [Result Rendering](#result-rendering)
7. [Setup & Configuration](#setup--configuration)
8. [Quick vs Full Comparison](#quick-vs-full-comparison)
9. [Open Questions](#open-questions)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Current State

### Existing Quick Analysis
- **Trigger**: "Quick Analysis" button in Vision Mode
- **Process**:
  1. User provides URL via browser prompt
  2. Navigate to URL, wait 2 seconds
  3. Scroll through page, capture screenshots
  4. Send to Gemini 2.5 Pro API
  5. Receive general webpage analysis
  6. Display markdown report
- **Prompt**: General website analysis (content, layout, visual elements, interactive elements, status/alerts, insights)
- **Speed**: Fast (5-10 seconds)
- **Privacy**: Cloud-based (Gemini API)

### Vision Agent Progress (External)
**Current Phase**: Phase 2 - Chart Analysis

**Completed**:
- ✅ Phase 0: Consolidation (organized codebase)
- ✅ Phase 1: Chart Recognition (VLM benchmarking, InternVL3-8B-6bit selected)

**In Progress**:
- 🔄 Phase 2: Chart Analysis (per-type extraction, specialized prompts)

**Planned**:
- 📋 Phase 3: Unified Pipeline (end-to-end dashboard processing)
- 📋 Phase 4: Vision Agent Prototype (change detection, anomaly summaries)

**Key Components**:
- OCR: PaddleOCR, Docling (MinerU: 93% success, 100% F1 on structured dashboards)
- VLM: InternVL3-8B-6bit (67.1% F1, best local option)
- LLM: Claude Sonnet 4 (36.4% F1, 57.8% precision with anti-hallucination prompts)
- Pipeline: Screenshot → OCR → LLM extraction → VLM chart detection → JSON report

**Performance Metrics**:
- OCR: 100% success rate (DeepSeek VL2), 93% (MinerU)
- Chart Detection: 67.1% F1 (InternVL3-8B-6bit)
- Metric Extraction: 36.4% F1, 83% reduction in false positives

---

## Vision Agent Background

### The Problem
Generic VLMs (like Gemini) can describe what's in an image, but struggle with:
- Extracting structured data from charts (series, values, trends)
- Accurate OCR for dense text/tables
- Detecting specific chart types (pie, bar, line, gauge)
- Identifying KPIs vs decorative elements
- Understanding dashboard-specific layouts (Grafana, Datadog)

### The Solution
**Specialized Pipeline**:
```
Screenshot → OCR (text extraction) → LLM (metric extraction) → VLM (chart detection) → Structured JSON
```

**Why This Works**:
1. **OCR First**: Extract all text accurately (PaddleOCR/Docling)
2. **LLM Extraction**: Parse text into structured metrics with anti-hallucination prompts
3. **VLM Detection**: Identify charts and extract visual data
4. **Combination**: Merge text + visual analysis for comprehensive understanding

---

## Architecture Options

### Option A: Flask API as Separate Service (Recommended)

```
┌─────────────────────┐
│   BrowserOS Agent   │
│  (Chrome Extension) │
└──────────┬──────────┘
           │ HTTP POST /api/v1/analyze
           │ (screenshots as base64)
           ▼
┌─────────────────────┐
│   Flask API Server  │
│   (localhost:5000)  │
│                     │
│  1. Receive images  │
│  2. Run PaddleOCR   │
│  3. Run Docling     │
│  4. Run InternVL3   │
│  5. LLM extraction  │
│  6. Chart detection │
│  7. Return JSON     │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ Local Models │
    │ - InternVL3  │
    │ - PaddleOCR  │
    │ - Docling    │
    └──────────────┘
```

**Pros**:
- ✅ Existing pipeline intact
- ✅ Models run locally (privacy-first)
- ✅ Independent service lifecycle
- ✅ Can be reused by other applications
- ✅ No Chrome extension size limits
- ✅ Heavy compute separate from browser

**Cons**:
- ❌ User must start Flask server manually
- ❌ Additional setup complexity
- ❌ Network dependency (localhost)
- ❌ Extra setup step

---

### Option B: Hybrid Approach (Quick + Full)

```
Quick Analysis:
  BrowserOS → Gemini API (simple, fast, cloud-based)
  - No setup required
  - Just API key
  - 5-10 seconds
  - General webpage analysis

Full Analysis:
  BrowserOS → Flask API → Local VLMs (comprehensive, slow, local)
  - Requires Flask server + models
  - 30-60 seconds
  - Structured chart/metric extraction
  - 100% local/private
```

**Why This Works**:
- **Quick Analysis** = Immediate results for casual users
- **Full Analysis** = Power users who installed Flask service get deep insights
- **Progressive Enhancement**: Users can start with Quick, upgrade to Full later

---

### Option C: Native Extension Integration (Future)

Use WebAssembly to run models directly in browser extension.

**Pros**: No external server
**Cons**: Chrome extension size limits, slower inference, complex build

**Decision**: Not recommended for initial version. Revisit in Phase 4.

---

## Flask API Design

### Endpoint Structure

#### `POST /api/v1/analyze`

**Request**:
```json
{
  "url": "https://dashboard.example.com",
  "screenshots": [
    "data:image/png;base64,iVBORw0KG...",
    "data:image/png;base64,iVBORw0KG..."
  ],
  "analysis_type": "full",
  "options": {
    "run_ocr": true,
    "detect_charts": true,
    "extract_metrics": true,
    "track_changes": false
  }
}
```

**Response**:
```json
{
  "status": "success",
  "analysis_id": "abc123",
  "timestamp": "2025-12-04T10:30:00Z",
  "url": "https://dashboard.example.com",
  "processing_time_ms": 3450,
  "results": {
    "ocr": {
      "engine": "paddleocr",
      "success": true,
      "text_blocks": [
        {"text": "CPU Usage", "bbox": [10, 20, 100, 40], "confidence": 0.98}
      ],
      "tables": [...],
      "total_characters": 1234
    },
    "charts": [
      {
        "id": "chart_1",
        "type": "line_chart",
        "bbox": [50, 100, 400, 300],
        "title": "CPU Usage Over Time",
        "confidence": 0.92,
        "data": {
          "series": [
            {"name": "Host 1", "values": [65, 70, 75, 85, 90]},
            {"name": "Host 2", "values": [55, 60, 58, 62, 65]}
          ],
          "x_axis": {"label": "Time", "values": ["10:00", "10:15", "10:30", "10:45", "11:00"]},
          "y_axis": {"label": "CPU %", "range": [0, 100]},
          "trends": "increasing",
          "anomalies": [
            {"timestamp": "10:45", "severity": "warning", "description": "Sudden spike in Host 1"}
          ]
        }
      },
      {
        "id": "chart_2",
        "type": "pie_chart",
        "bbox": [500, 100, 700, 300],
        "title": "Memory Distribution",
        "confidence": 0.88,
        "data": {
          "segments": [
            {"label": "Application", "value": 45, "percentage": 45},
            {"label": "System", "value": 30, "percentage": 30},
            {"label": "Cache", "value": 25, "percentage": 25}
          ]
        }
      }
    ],
    "metrics": [
      {
        "id": "metric_1",
        "name": "cpu_usage_host_1",
        "display_name": "Host 1 CPU Usage",
        "value": "85%",
        "unit": "percent",
        "status": "warning",
        "threshold": 80,
        "bbox": [10, 50, 150, 80]
      },
      {
        "id": "metric_2",
        "name": "memory_usage",
        "display_name": "Memory Usage",
        "value": "95%",
        "unit": "percent",
        "status": "critical",
        "threshold": 90,
        "bbox": [10, 100, 150, 130]
      }
    ],
    "summary": {
      "total_charts": 5,
      "total_metrics": 12,
      "alert_count": 2,
      "health_status": "warning",
      "key_insights": [
        "CPU usage trending upward on Host 1 (+15% in last hour)",
        "Memory at 95% capacity - critical threshold reached",
        "2 error alerts detected requiring immediate attention",
        "5 charts analyzed: 3 line charts, 1 pie chart, 1 gauge"
      ]
    }
  }
}
```

#### `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "models_loaded": {
    "internvl3": true,
    "paddleocr": true,
    "docling": true
  },
  "capabilities": ["ocr", "chart_detection", "metric_extraction"]
}
```

---

## BrowserOS Integration

### Full Analysis Button Flow

```
User clicks "Full Analysis"
  ↓
Check if Flask API is running
  → GET http://localhost:5000/health
  ↓
  ├─ API Available (200 OK) → Proceed
  │   ↓
  │   Prompt user for URL
  │   ↓
  │   Navigate to URL
  │   ↓
  │   Wait 2 seconds for page load
  │   ↓
  │   Capture screenshots (scroll through page)
  │   ↓
  │   Show loading state: "Processing with Vision Agent..."
  │   ↓
  │   POST to Flask API /api/v1/analyze
  │   {
  │     url: websiteUrl,
  │     screenshots: [base64...],
  │     analysis_type: "full"
  │   }
  │   ↓
  │   Poll for progress (optional)
  │   ↓
  │   Receive JSON response
  │   ↓
  │   Parse and render results
  │
  └─ API Not Available (Error) → Show setup instructions
      ⚠️ Vision Agent API Not Found

      Full Analysis requires a local Vision Agent server.

      [View Setup Guide]  [Use Quick Analysis Instead]
```

### Code Integration Points

**File**: `packages/browseros-agent/src/sidepanel/components/MessageList.tsx`

**Function**: `handleFullAnalysis()` (currently empty)

**Steps**:
1. Check Flask API availability
2. Get URL from user
3. Navigate and capture screenshots (reuse Quick Analysis logic)
4. POST to Flask API
5. Handle response and render results

---

## Result Rendering

### Option A: Rich Markdown Report (Simpler)

```markdown
# 📊 Full Vision Analysis

**URL**: https://dashboard.example.com
**Analyzed**: December 4, 2025 at 10:30 AM
**Processing Time**: 3.5 seconds
**Screenshots**: 3 analyzed, 5 charts detected, 12 metrics extracted

---

## 📈 Charts Detected

### Chart 1: CPU Usage Over Time (Line Chart)
**Location**: Top-left panel
**Confidence**: 92%
**Trend**: ↗️ Increasing (+15% over last hour)
**Status**: ⚠️ Warning - approaching threshold
**Data Points**: 24 (last 24 hours)

**Series**:
- Host 1: 65% → 90% (↗️ +25%)
- Host 2: 55% → 65% (↗️ +10%)

**Anomalies**:
- ⚠️ 10:45 AM - Sudden spike in Host 1 CPU usage

[View Raw Data]

---

### Chart 2: Memory Distribution (Pie Chart)
**Location**: Top-right panel
**Confidence**: 88%
**Status**: ✅ Normal

**Breakdown**:
- Application Memory: 45%
- System Memory: 30%
- Cache: 25%

---

## 📊 Metrics Summary

| Metric | Value | Status | Threshold | Location |
|--------|-------|--------|-----------|----------|
| Host 1 CPU Usage | 85% | ⚠️ Warning | 80% | Panel 1 |
| Memory Usage | 95% | 🚨 Critical | 90% | Panel 2 |
| Disk I/O | 45% | ✅ Normal | 70% | Panel 3 |
| Network Throughput | 230 Mbps | ✅ Normal | 500 Mbps | Panel 4 |

**Alerts**: 2 warnings, 1 critical

---

## 🔍 OCR Text Extraction

<details>
<summary>View extracted text (1,234 characters)</summary>

CPU Usage
Host 1: 85%
Host 2: 65%

Memory Usage
Total: 16 GB
Used: 15.2 GB (95%)
Available: 0.8 GB

...
</details>

---

## 💡 Key Insights

1. **CPU Usage Trending Upward**: Host 1 CPU has increased 15% in the last hour. Investigate running processes.

2. **Memory Critical**: System memory at 95% capacity. Consider scaling or clearing cache.

3. **2 Alerts Require Attention**:
   - Host 1 CPU above warning threshold
   - Memory usage in critical zone

4. **Network Performance Normal**: All network metrics within expected ranges.

---

## 🔬 Technical Details

**OCR Engine**: PaddleOCR
**Chart Detection Model**: InternVL3-8B-6bit
**Charts Detected**: 5 (3 line, 1 pie, 1 gauge)
**Metrics Extracted**: 12 KPIs
**Confidence Score**: 89% average
```

---

### Option B: Interactive React Components (More Complex)

**Custom React Components**:

```tsx
// Chart Card Component
<ChartCard
  id="chart_1"
  type="line_chart"
  title="CPU Usage Over Time"
  confidence={0.92}
  trend="increasing"
  status="warning"
  data={chartData}
  onExpand={() => showChartDetails(chart_1)}
/>

// Metric Dashboard
<MetricGrid>
  {metrics.map(metric => (
    <MetricCard
      key={metric.id}
      name={metric.display_name}
      value={metric.value}
      status={metric.status}
      threshold={metric.threshold}
      onChange={metric.change}
    />
  ))}
</MetricGrid>

// Interactive Features
- Click chart to see detailed data
- Hover to highlight bbox on screenshot
- Filter metrics by status (critical, warning, normal)
- Expandable sections
- Export to JSON/CSV
```

**Pros**: Rich interactivity, better UX
**Cons**: More dev time, larger bundle size

---

## Setup & Configuration

### User Setup Flow

#### 1. First-Time Experience

When user clicks "Full Analysis" and Flask API is not running:

```
┌────────────────────────────────────────────┐
│  ⚠️ Vision Agent API Not Found            │
│                                            │
│  Full Analysis requires a local Vision    │
│  Agent server for:                         │
│                                            │
│  • OCR text extraction (PaddleOCR/Docling)│
│  • Local VLM chart detection (InternVL3)  │
│  • Advanced metric extraction              │
│  • 100% private processing                 │
│                                            │
│  [📖 View Setup Guide]  [Quick Analysis]  │
└────────────────────────────────────────────┘
```

#### 2. Setup Guide Modal

```markdown
# Vision Agent Setup

## Prerequisites
- Python 3.9+
- 8GB RAM minimum (16GB recommended)
- ~5GB disk space for models

## Installation

### Step 1: Clone Repository
```bash
git clone https://github.com/yourusername/browseros-vision-agent
cd browseros-vision-agent
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Download Models (One-Time, ~5GB)
```bash
python setup_models.py
```

This will download:
- InternVL3-8B-6bit (~4GB)
- PaddleOCR models (~500MB)
- Docling dependencies (~500MB)

### Step 4: Start Server
```bash
python vision_agent_api.py
```

Server will start at: `http://localhost:5000`

## Verification

Once running, you should see:
```
✅ Vision Agent API running on http://localhost:5000
✅ InternVL3-8B-6bit loaded
✅ PaddleOCR initialized
✅ Ready to process requests
```

Go back to BrowserOS Vision Mode and click "Full Analysis" again!

## Troubleshooting

**Port 5000 already in use?**
Edit `config.py` and change `PORT = 5001`

**Out of memory errors?**
Reduce batch size in `config.py`: `BATCH_SIZE = 1`

**Models won't download?**
Check firewall settings or download manually from [models link]
```

#### 3. Status Indicator

Add to Vision Mode header:

```tsx
<div className="vision-agent-status">
  {apiConnected ? (
    <span className="status-connected">
      ✅ Vision Agent: Connected
    </span>
  ) : (
    <span className="status-disconnected">
      ⚠️ Vision Agent: Offline
      <button onClick={showSetupGuide}>Setup</button>
    </span>
  )}
</div>
```

---

## Quick vs Full Comparison

| Feature | Quick Analysis | Full Analysis |
|---------|----------------|---------------|
| **Speed** | Fast (5-10s) | Slower (30-60s per dashboard) |
| **Setup Required** | None (just Gemini API key) | Flask API + model downloads |
| **Privacy** | Cloud (Gemini API) | 100% local processing |
| **Analysis Depth** | General webpage description | Structured chart/metric extraction |
| **OCR** | ❌ No | ✅ PaddleOCR/Docling |
| **Chart Detection** | ❌ No | ✅ InternVL3-8B (67% F1) |
| **Metric Extraction** | ❌ No | ✅ Structured JSON with anti-hallucination |
| **Dashboard Support** | Generic | Specialized (Grafana, Datadog, etc.) |
| **Trend Detection** | ❌ No | ✅ Time-series analysis |
| **Anomaly Detection** | ❌ No | ✅ Outlier identification |
| **Export Format** | Markdown | JSON + Markdown |
| **Cost** | Gemini API calls | Free (local compute) |
| **Use Case** | Quick webpage overview | Dashboard monitoring & analysis |
| **Accuracy** | Good for general content | High for charts/metrics (67-89% F1) |

---

## Open Questions

### 1. Repository Structure
**Question**: Should Flask API be part of BrowserOS monorepo or separate?

**Option A**: Monorepo (`packages/vision-agent-api/`)
- Pros: Single repo, easier versioning, shared docs
- Cons: Large binary files (models), slower git clone

**Option B**: Separate Repo (`browseros-vision-agent`)
- Pros: Independent releases, cleaner separation, smaller BrowserOS repo
- Cons: Version sync challenges, two repos to maintain

**Recommendation**: ?

---

### 2. Model Management
**Question**: How should users download models?

**Option A**: Setup Script (Recommended)
```bash
python setup_models.py
# Downloads from HuggingFace/ModelScope
```

**Option B**: Include in Repo
- Pros: Single download
- Cons: 5GB+ repo size, git LFS required

**Option C**: Docker Image
```bash
docker pull browseros/vision-agent:latest
docker run -p 5000:5000 browseros/vision-agent
```

**Recommendation**: ?

---

### 3. Result Format Preference
**Question**: Markdown report or interactive React components?

**Option A**: Markdown (Quick to implement)
- Similar to current Quick Analysis
- Easy to implement
- Limited interactivity

**Option B**: React Components (Better UX)
- Rich interactivity
- Better data visualization
- More dev time

**Recommendation**: Start with Markdown (Phase 2), add components later (Phase 4)?

---

### 4. Change Detection & History
**Question**: Should Full Analysis store history for change tracking?

**Potential Features**:
- Compare dashboard state over time
- Alert on metric changes
- Track chart trend changes
- Historical analysis

**Implementation**:
- Store analysis results in Chrome storage
- Compare new analysis with previous
- Highlight changes in report

**Recommendation**: Phase 4 feature?

---

### 5. Real-Time Monitoring
**Question**: Support continuous monitoring?

**Feature**: Re-analyze dashboard every N seconds, detect changes

**Use Case**:
- Monitor production dashboards
- Alert on anomalies
- Track KPI changes in real-time

**Challenges**:
- Resource intensive
- Need background worker
- Rate limiting concerns

**Recommendation**: Phase 4 feature?

---

### 6. Phase Integration Timing
**Question**: Which phase should BrowserOS integrate with?

**Option A**: Phase 2 (Current)
- Chart analysis per-type extraction in progress
- Partial functionality available now
- Can start integration sooner

**Option B**: Phase 3 (Unified Pipeline)
- Complete end-to-end pipeline ready
- More stable API
- Better integrated features
- Target: ~12/05

**Recommendation**: ?

---

## Implementation Roadmap

### Phase 1: Planning & Design ✅ (Current)
- [x] Document architecture options
- [x] Define Flask API structure
- [x] Plan BrowserOS integration points
- [ ] Answer open questions
- [ ] Get stakeholder approval

### Phase 2: Flask API Development
**Timeline**: TBD
**Dependencies**: Vision Agent Phase 2/3 completion

**Tasks**:
- [ ] Create Flask API skeleton
- [ ] Implement `/health` endpoint
- [ ] Implement `/api/v1/analyze` endpoint
- [ ] Integrate OCR pipeline (PaddleOCR/Docling)
- [ ] Integrate VLM pipeline (InternVL3)
- [ ] Integrate LLM extraction
- [ ] Add error handling & logging
- [ ] Write API tests
- [ ] Create setup script (`setup_models.py`)
- [ ] Write API documentation

### Phase 3: BrowserOS Integration
**Timeline**: TBD
**Dependencies**: Phase 2 complete

**Tasks**:
- [ ] Add API health check on Vision Mode load
- [ ] Implement `handleFullAnalysis()` function
- [ ] Add screenshot capture reuse
- [ ] Add Flask API client
- [ ] Add loading states
- [ ] Add error handling (API offline)
- [ ] Parse JSON response
- [ ] Render markdown report
- [ ] Add status indicator to UI
- [ ] Create setup guide modal

### Phase 4: Enhanced Features
**Timeline**: TBD
**Dependencies**: Phase 3 complete

**Tasks**:
- [ ] Add interactive React components
- [ ] Implement change detection
- [ ] Add history storage
- [ ] Add export functionality (JSON/CSV)
- [ ] Add real-time monitoring mode
- [ ] Improve error messages
- [ ] Add telemetry & analytics
- [ ] Performance optimization

### Phase 5: Polish & Launch
**Timeline**: TBD
**Dependencies**: Phase 4 complete

**Tasks**:
- [ ] User testing
- [ ] Documentation (user guide, API docs)
- [ ] Video tutorials
- [ ] Performance benchmarks
- [ ] Security audit
- [ ] Release notes
- [ ] Marketing materials

---

## Next Steps

1. **Review this document** and provide feedback
2. **Answer open questions** (see section above)
3. **Decide on timeline** for Phase 2 start
4. **Focus on Quick Analysis improvements** (as requested)

---

## References

- [Vision Agent Progress Update (11/20)](link-to-your-notes)
- [InternVL3 Paper](https://arxiv.org/abs/2410.17910)
- [PaddleOCR Documentation](https://github.com/PaddlePaddle/PaddleOCR)
- [Docling (MinerU) Documentation](https://github.com/opendatalab/MinerU)
- [BrowserOS Agent Documentation](../CLAUDE.md)

---

**Document Maintenance**:
- Update as decisions are made
- Track implementation progress
- Note any architectural changes
- Record lessons learned
