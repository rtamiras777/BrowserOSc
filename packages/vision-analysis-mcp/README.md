# Vision Analysis Flask API

Simple Flask API for BrowserOS vision analysis. Returns "yes" as proof-of-concept.

## Quick Start

### Option 1: Run Locally (Fastest)

```bash
cd packages/vision-analysis-mcp

# Install dependencies
pip install -r requirements.txt

# Run server
python server.py
```

Server will start at `http://localhost:5000`

### Option 2: Docker

```bash
cd packages/vision-analysis-mcp

# Build image
docker build -t vision-analysis:latest .

# Run container
docker run -p 5000:5000 vision-analysis:latest
```

## API Endpoints

### Health Check
```bash
GET http://localhost:5000/health

Response:
{
  "status": "healthy",
  "service": "vision-analysis"
}
```

### Analyze Dashboard
```bash
POST http://localhost:5000/analyze
Content-Type: application/json

{
  "screenshots": ["base64_encoded_image1", "base64_encoded_image2"]
}

Response:
{
  "success": true,
  "result": "yes",
  "screenshots_analyzed": 2
}
```

## Test with BrowserOS

1. **Start the API**:
   ```bash
   cd packages/vision-analysis-mcp
   python server.py
   ```

2. **Reload BrowserOS Extension**:
   - Go to `chrome://extensions/`
   - Find "BrowserOS Agent"
   - Click reload 🔄

3. **Test Full Analysis**:
   - Open BrowserOS
   - Switch to **Vision Mode**
   - Click **"Full Analysis"** button
   - Enter a website URL when prompted
   - Watch it navigate, capture, and analyze!

4. **Expected Output**:
   ```
   ✅ Full Analysis Complete!

   Result: yes

   Screenshots Analyzed: 1

   Note: This is a proof-of-concept. Full OCR and VLM analysis will be integrated next.
   ```

## Test Manually with curl

```bash
# Start the server
python server.py

# In another terminal, test the API
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"screenshots": ["data:image/png;base64,iVBORw0KGgo..."]}'
```

## Troubleshooting

### "Connection refused" error
- Make sure Flask server is running: `python server.py`
- Check logs for errors
- Verify port 5000 is not blocked

### CORS errors in browser
- flask-cors is installed and configured
- Check browser console for specific CORS errors

### API returns 400 error
- Check request format
- Ensure screenshots array is provided
- Verify Content-Type is application/json

## Next Steps

Once POC is working, integrate real analysis:

### 1. Add PaddleOCR
```python
from paddleocr import PaddleOCR

ocr = PaddleOCR(use_angle_cls=True, lang='en')

def extract_text(image_base64):
    # Decode base64 to image
    # Run OCR
    # Return structured text
    pass
```

### 2. Add InternVL3-8B
```python
from transformers import AutoModel, AutoTokenizer

model = AutoModel.from_pretrained('InternVL3-8B')
tokenizer = AutoTokenizer.from_pretrained('InternVL3-8B')

def analyze_dashboard(image, text):
    # Combine OCR text + vision analysis
    # Return structured insights
    pass
```

### 3. Return Structured Output
Match Quick Analysis format:
```json
{
  "page_title": "Dashboard Name",
  "health_status": "healthy",
  "key_metrics": [...],
  "alerts": [...],
  "recommendations": [...]
}
```

## Architecture

```
BrowserOS Extension
    ↓ (captures screenshot)
    ↓ (POST /analyze)
Flask API (localhost:5000)
    ↓ (future: OCR)
PaddleOCR
    ↓ (future: VLM)
InternVL3-8B
    ↓
Return Analysis
```

## Files

```
packages/vision-analysis-mcp/
├── server.py          # Flask API
├── requirements.txt   # Python dependencies
├── Dockerfile         # Docker config
└── README.md         # This file
```
