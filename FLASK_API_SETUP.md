# Flask API Setup - Vision Analysis ✅

The Vision Analysis feature has been converted from MCP to a simple Flask API!

## What Changed

❌ **Before**: MCP server through Klavis (not supported for custom servers)
✅ **Now**: Simple Flask API that BrowserOS calls directly

## Quick Test (2 minutes)

### 1. Start Flask API

```bash
cd packages/vision-analysis-mcp

# Install dependencies (first time only)
pip install -r requirements.txt

# Start server
python server.py
```

You should see:
```
 * Running on http://0.0.0.0:5000
 * Running on http://127.0.0.1:5000
```

### 2. Reload BrowserOS Extension

1. Go to `chrome://extensions/`
2. Find "BrowserOS Agent"
3. Click reload 🔄

### 3. Test Full Analysis

1. Open BrowserOS extension
2. Switch to **Vision Mode** (mode toggle at top)
3. Click **"Full Analysis"** button
4. Enter any website URL (e.g., `https://example.com`)
5. Watch the magic! ✨

### 4. Expected Result

BrowserOS will:
1. Navigate to the website
2. Capture a screenshot
3. Call Flask API at `http://localhost:5000/analyze`
4. Display result:

```
✅ Full Analysis Complete!

Result: yes

Screenshots Analyzed: 1

Note: This is a proof-of-concept. Full OCR and VLM analysis will be integrated next.
```

## How It Works

```
User clicks "Full Analysis"
    ↓
BrowserOS navigates to URL
    ↓
Captures screenshot
    ↓
POST http://localhost:5000/analyze
    {
      "screenshots": ["base64_image..."]
    }
    ↓
Flask API receives request
    ↓
Returns: { "success": true, "result": "yes" }
    ↓
BrowserOS displays result
```

## Troubleshooting

### Issue: "API error: Failed to fetch"

**Solution**: Make sure Flask server is running
```bash
cd packages/vision-analysis-mcp
python server.py
```

### Issue: "Connection refused"

**Solution**: Check if port 5000 is available
```bash
# Kill any process using port 5000
lsof -ti:5000 | xargs kill -9

# Restart Flask
python server.py
```

### Issue: No response in BrowserOS

**Solution**: Check Flask logs for errors
- Flask terminal will show all incoming requests
- Look for errors or 400/500 responses

## Test Manually

Test the API directly without BrowserOS:

```bash
# In one terminal, start Flask
cd packages/vision-analysis-mcp
python server.py

# In another terminal, test the API
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"screenshots": ["data:image/png;base64,test"]}'

# Expected response:
# {"result":"yes","screenshots_analyzed":1,"success":true}
```

## Files Modified

✅ **Flask API**:
- `packages/vision-analysis-mcp/server.py` - Converted to Flask
- `packages/vision-analysis-mcp/requirements.txt` - Updated dependencies
- `packages/vision-analysis-mcp/Dockerfile` - Updated for Flask

✅ **BrowserOS Integration**:
- `packages/browseros-agent/src/sidepanel/components/MessageList.tsx` - Updated `handleFullAnalysis()` to call Flask API
- `packages/browseros-agent/src/config/mcpServers.ts` - Removed Vision Analysis from MCP list

✅ **Build**:
- Extension rebuilt with new integration

## What's Next?

Once you confirm "yes" is working, we can integrate:

### 1. PaddleOCR
Extract text from screenshots using OCR

### 2. InternVL3-8B
Analyze dashboard visually with VLM

### 3. Structured Output
Return analysis matching Quick Analysis format:
- Health status
- Key metrics
- Alerts
- Recommendations

---

**Ready to test? Start Flask and click Full Analysis! 🚀**
