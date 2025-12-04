# Full Analysis Setup - PaddleOCR + InternVL + Claude Haiku 🚀

Complete setup guide for the full ML pipeline!

## Overview

**Pipeline**: Screenshots → PaddleOCR → InternVL3-8B → Claude Haiku → Structured Analysis

The system:
1. **Extracts text** from screenshots using PaddleOCR
2. **Analyzes visually** with InternVL vision-language model
3. **Synthesizes results** with Claude Haiku into structured JSON
4. **Displays beautifully** in BrowserOS

---

## Setup (15-30 minutes)

### Step 1: Install Python Dependencies

```bash
cd packages/vision-analysis-mcp

# Install dependencies (this will download models ~2-4GB)
pip install -r requirements.txt
```

**Note**: First run will download:
- PaddleOCR models (~140MB)
- InternVL2-2B model (~4GB)

### Step 2: Configure Claude API Key

Create `.env` file:

```bash
cd packages/vision-analysis-mcp
cp .env.example .env

# Edit .env and add your Claude API key
# ANTHROPIC_API_KEY=your_key_here
```

Get your API key from: https://console.anthropic.com/

### Step 3: Start the Server

```bash
cd packages/vision-analysis-mcp
python server.py
```

**Expected output**:
```
INFO:__main__:Initializing models...
INFO:__main__:Loading PaddleOCR...
INFO:__main__:✓ PaddleOCR loaded
INFO:__main__:Loading InternVL3-8B... (this may take a few minutes)
INFO:__main__:✓ InternVL loaded on cpu
INFO:__main__:✓ Claude client initialized
INFO:__main__:All models loaded successfully!
INFO:__main__:Starting Flask server...
 * Running on http://0.0.0.0:5000
```

**First run**: Model loading takes 2-5 minutes. Subsequent runs are faster (~30 seconds).

### Step 4: Reload BrowserOS Extension

1. Go to `chrome://extensions/`
2. Find "BrowserOS Agent"
3. Click reload 🔄

### Step 5: Test Full Analysis!

1. Open BrowserOS extension
2. Switch to **Vision Mode**
3. Click **"Full Analysis"** button
4. Enter a dashboard URL (e.g., `https://grafana.com/`)
5. Watch the magic happen! ✨

---

## Expected Output

```markdown
# ✅ Full Analysis Complete!

**URL**: https://your-dashboard.com
**Screenshots Analyzed**: 1

## 📄 Dashboard Title

*Brief description of the page*

**Overall Health**: ✅ HEALTHY

### 🚨 Critical Issues

- Issue 1
- Issue 2

### 📊 Key Metrics

| Metric | Value | Status | Trend |
|--------|-------|--------|-------|
| CPU Usage | 45% | ➖ normal | ↗️ |
| Memory | 2.1GB | ✅ good | → |

### 💡 Key Insights

1. Insight about system performance
2. Another important observation

### ✅ Recommendations

1. Action item 1
2. Action item 2

---

**Pipeline Details**:
- OCR Elements: 87
- OCR Text Length: 2,341 chars
- VLM Response: 512 chars
```

---

## Troubleshooting

### Issue: "Models not loaded"

**Solution**: Wait for model initialization. Check server logs for errors.

```bash
# Check if server is running
curl http://localhost:5000/health

# Expected response:
{
  "status": "healthy",
  "models": {
    "ocr": true,
    "vlm": true,
    "claude": true
  }
}
```

### Issue: "ANTHROPIC_API_KEY not set"

**Solution**: Create `.env` file with your API key:

```bash
cd packages/vision-analysis-mcp
echo "ANTHROPIC_API_KEY=your_key_here" > .env
```

### Issue: Out of Memory (OOM)

**Solution**: You may need to use a smaller model or add more RAM. The default uses InternVL2-2B which requires ~4GB RAM.

To use GPU (much faster):
```bash
# Install CUDA-enabled PyTorch
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

### Issue: Slow Analysis

**Typical times** (CPU):
- OCR: 2-5 seconds
- VLM: 10-30 seconds
- Claude: 2-5 seconds
- **Total**: 15-40 seconds per screenshot

**With GPU**:
- OCR: 1-2 seconds
- VLM: 2-5 seconds
- Claude: 2-5 seconds
- **Total**: 5-12 seconds

### Issue: ImportError or ModuleNotFoundError

**Solution**: Reinstall dependencies:

```bash
cd packages/vision-analysis-mcp
pip install --upgrade -r requirements.txt
```

---

## Model Configuration

### Using Different VLM Models

Edit `server.py` line 61:

```python
# Current (faster, less accurate):
model_name = "OpenGVLab/InternVL2-2B"

# For better accuracy (slower, requires more RAM):
model_name = "OpenGVLab/InternVL2-8B"

# Or use InternVL3 (if available):
model_name = "OpenGVLab/InternVL3-8B"
```

### Using Different Claude Models

Edit `server.py` line 237:

```python
# Current (fast, cheap):
model="claude-3-5-haiku-20241022"

# For better analysis (slower, more expensive):
model="claude-3-5-sonnet-20241022"
```

---

## Performance Tips

### 1. Use GPU
Install CUDA-enabled PyTorch for 3-5x speedup:

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

### 2. Reduce Image Size
In MessageList.tsx, capture smaller screenshots:

```typescript
const screenshot = await chrome.tabs.captureVisibleTab(currentTab.windowId, {
  format: 'jpeg',  // Changed from 'png'
  quality: 80      // Add quality parameter
})
```

### 3. Batch Processing
For multiple screenshots, process in parallel:

```python
# In server.py, use asyncio for parallel processing
import asyncio

async def process_all_screenshots(screenshots):
    tasks = [process_screenshot(img) for img in screenshots]
    return await asyncio.gather(*tasks)
```

---

## Architecture

```
┌─────────────────┐
│ BrowserOS       │
│ Extension       │
└────────┬────────┘
         │ 1. Capture screenshot
         │ 2. POST /analyze
         ▼
┌─────────────────┐
│ Flask API       │
│ (port 5000)     │
└────────┬────────┘
         │
         ├──────────────────────────────────┐
         │                                   │
         ▼                                   ▼
┌─────────────────┐              ┌─────────────────┐
│  PaddleOCR      │              │  InternVL2-2B   │
│  Text Extraction│              │  Vision Analysis│
└────────┬────────┘              └────────┬────────┘
         │                                  │
         │    3. Combine OCR + VLM         │
         └──────────────┬──────────────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ Claude Haiku    │
               │ Structured JSON │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ BrowserOS       │
               │ Display Results │
               └─────────────────┘
```

---

## Cost Estimation

**Per Analysis**:
- PaddleOCR: Free (local)
- InternVL: Free (local)
- Claude Haiku: ~$0.001-0.003 (depending on screenshot content)

**For 1000 analyses**: ~$1-3

**GPU Recommendation**: Speeds up analysis 3-5x and reduces latency from 30s → 8s

---

## What's Next?

### Phase 1: Multi-Screenshot Support
Currently processes 1 screenshot. Extend to handle multiple:

```python
# Process all screenshots in parallel
for screenshot in screenshots:
    results.append(await process_screenshot(screenshot))

# Consolidate with Claude
consolidated = await consolidate_analyses(results)
```

### Phase 2: Caching
Cache OCR/VLM results for similar pages to speed up repeated analyses.

### Phase 3: Real-time Monitoring
Set up webhook to trigger analysis on dashboard changes.

---

**Ready to analyze dashboards with AI! 🎉**
