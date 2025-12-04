#!/usr/bin/env python3
"""
Vision Analysis Flask API
Integrates PaddleOCR + InternVL3-8B + Claude Haiku for dashboard analysis.
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import logging
import os
import io
from typing import List, Dict, Any
from dotenv import load_dotenv
from PIL import Image
import numpy as np

# ML Imports
from paddleocr import PaddleOCR
from transformers import AutoModel, AutoTokenizer
import torch
from anthropic import Anthropic

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for browser extension

# Global model instances (load once on startup)
ocr_model = None
vlm_model = None
vlm_tokenizer = None
claude_client = None

def initialize_models():
    """Initialize all ML models on startup."""
    global ocr_model, vlm_model, vlm_tokenizer, claude_client

    logger.info("Initializing models...")

    try:
        # Initialize PaddleOCR
        logger.info("Loading PaddleOCR...")
        # Use minimal parameters - newer versions have different API
        ocr_model = PaddleOCR(lang='en')
        logger.info("✓ PaddleOCR loaded")

        # Initialize InternVL3-8B
        logger.info("Loading InternVL3-8B... (this may take a few minutes)")
        device = "cuda" if torch.cuda.is_available() else "cpu"

        # Using a smaller variant for faster loading - adjust as needed
        model_name = "OpenGVLab/InternVL2-2B"  # Smaller variant, change to InternVL3-8B if you have resources

        vlm_tokenizer = AutoTokenizer.from_pretrained(
            model_name,
            trust_remote_code=True
        )
        vlm_model = AutoModel.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            trust_remote_code=True,
            low_cpu_mem_usage=True
        ).to(device).eval()

        logger.info(f"✓ InternVL loaded on {device}")

        # Initialize Claude
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            logger.warning("ANTHROPIC_API_KEY not set. Set it in .env file.")
            claude_client = None
        else:
            claude_client = Anthropic(api_key=api_key)
            logger.info("✓ Claude client initialized")

        logger.info("All models loaded successfully!")

    except Exception as e:
        logger.error(f"Error initializing models: {e}")
        raise

def decode_base64_image(base64_string: str) -> Image.Image:
    """Decode base64 string to PIL Image."""
    # Remove data URL prefix if present
    if base64_string.startswith('data:image'):
        base64_string = base64_string.split(',')[1]

    image_data = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_data))
    return image

def extract_text_with_ocr(image: Image.Image) -> Dict[str, Any]:
    """Extract text from image using PaddleOCR."""
    logger.info("Running OCR...")

    # Convert PIL image to numpy array
    image_np = np.array(image)

    # Run OCR
    result = ocr_model.ocr(image_np, cls=True)

    # Parse results
    extracted_text = []
    for line in result[0] if result[0] else []:
        text = line[1][0]  # Extract text
        confidence = line[1][1]  # Extract confidence
        bbox = line[0]  # Bounding box

        extracted_text.append({
            "text": text,
            "confidence": confidence,
            "bbox": bbox
        })

    # Concatenate all text
    full_text = " ".join([item["text"] for item in extracted_text])

    logger.info(f"OCR extracted {len(extracted_text)} text elements")

    return {
        "full_text": full_text,
        "elements": extracted_text
    }

def analyze_with_vlm(image: Image.Image, ocr_text: str) -> str:
    """Analyze image with InternVL vision-language model."""
    logger.info("Running VLM analysis...")

    # Prepare prompt
    prompt = f"""Analyze this dashboard/webpage screenshot.

OCR extracted text:
{ocr_text}

Based on the image and text, provide:
1. Page title or main heading
2. Primary purpose of this page
3. Key metrics visible (numbers, percentages, stats)
4. Charts or visualizations present
5. Any alerts, warnings, or error messages
6. Overall health status (healthy/warning/critical)

Be concise and focus on actionable insights."""

    # Prepare inputs
    pixel_values = vlm_model.vision_encoder.image_processor(
        images=image,
        return_tensors="pt"
    ).pixel_values.to(vlm_model.device)

    inputs = vlm_tokenizer(
        prompt,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=512
    ).to(vlm_model.device)

    # Generate response
    with torch.no_grad():
        outputs = vlm_model.generate(
            **inputs,
            pixel_values=pixel_values,
            max_new_tokens=512,
            num_beams=3,
            temperature=0.7
        )

    response = vlm_tokenizer.decode(outputs[0], skip_special_tokens=True)

    logger.info("VLM analysis complete")
    return response

def analyze_with_claude(ocr_results: Dict, vlm_analysis: str, screenshot_count: int) -> Dict[str, Any]:
    """Send combined analysis to Claude Haiku for final structured output."""
    logger.info("Sending to Claude Haiku for final analysis...")

    if not claude_client:
        logger.warning("Claude client not initialized, returning raw results")
        return {
            "error": "Claude API key not configured",
            "ocr_text": ocr_results["full_text"],
            "vlm_analysis": vlm_analysis
        }

    prompt = f"""You are analyzing a dashboard/webpage. Here's the data collected:

OCR EXTRACTED TEXT:
{ocr_results['full_text']}

VISION MODEL ANALYSIS:
{vlm_analysis}

Based on this information, return a JSON object with this structure:
{{
  "page_title": "string - the page title",
  "primary_purpose": "string - what this page is for (1 sentence)",
  "health_status": "healthy" | "warning" | "critical" | "unknown",
  "key_metrics": [
    {{
      "name": "string",
      "value": "string with unit",
      "status": "good" | "warning" | "critical" | "normal",
      "trend": "increasing" | "decreasing" | "stable" | "unknown"
    }}
  ],
  "alerts": [
    {{
      "severity": "critical" | "warning" | "info",
      "message": "string"
    }}
  ],
  "charts": ["list of chart titles/types detected"],
  "critical_issues": ["list of critical problems requiring immediate attention"],
  "key_insights": ["important insights about system health or performance"],
  "recommendations": ["actionable recommendations"]
}}

Rules:
- Extract max 6 key_metrics (most important only)
- Max 3 critical_issues, 3 key_insights, 3 recommendations
- Be specific with numbers and values
- Focus on actionable information
- Return ONLY valid JSON, no other text"""

    try:
        message = claude_client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=2000,
            temperature=0.3,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        response_text = message.content[0].text

        # Try to parse as JSON
        import json
        # Remove markdown code blocks if present
        response_text = response_text.replace('```json\n', '').replace('```', '').strip()
        analysis = json.loads(response_text)

        logger.info("Claude analysis complete")
        return analysis

    except Exception as e:
        logger.error(f"Claude analysis failed: {e}")
        return {
            "error": f"Claude analysis failed: {str(e)}",
            "page_title": "Analysis Error",
            "health_status": "unknown",
            "ocr_text": ocr_results["full_text"][:500],  # First 500 chars
            "vlm_analysis": vlm_analysis[:500]
        }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    models_loaded = {
        "ocr": ocr_model is not None,
        "vlm": vlm_model is not None,
        "claude": claude_client is not None
    }

    return jsonify({
        "status": "healthy",
        "service": "vision-analysis",
        "models": models_loaded
    })

@app.route('/analyze', methods=['POST'])
def analyze_dashboard():
    """
    Analyze dashboard screenshots with full ML pipeline.

    Pipeline: Screenshots → PaddleOCR → InternVL3-8B → Claude Haiku → Structured Analysis
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "No JSON data provided"
            }), 400

        screenshots = data.get('screenshots', [])

        if not screenshots:
            return jsonify({
                "success": False,
                "error": "No screenshots provided"
            }), 400

        logger.info(f"Received {len(screenshots)} screenshots for analysis")

        # Check if models are loaded
        if not ocr_model or not vlm_model:
            return jsonify({
                "success": False,
                "error": "Models not loaded. Please wait for initialization."
            }), 503

        # Process first screenshot (can extend to multiple later)
        screenshot_b64 = screenshots[0]

        # Decode image
        logger.info("Decoding image...")
        image = decode_base64_image(screenshot_b64)

        # Step 1: Extract text with OCR
        ocr_results = extract_text_with_ocr(image)

        # Step 2: Analyze with VLM
        vlm_analysis = analyze_with_vlm(image, ocr_results["full_text"])

        # Step 3: Send to Claude for final structured analysis
        final_analysis = analyze_with_claude(ocr_results, vlm_analysis, len(screenshots))

        # Return structured result
        result = {
            "success": True,
            "screenshots_analyzed": len(screenshots),
            "analysis": final_analysis,
            "pipeline": {
                "ocr_elements": len(ocr_results["elements"]),
                "ocr_text_length": len(ocr_results["full_text"]),
                "vlm_response_length": len(vlm_analysis)
            }
        }

        logger.info(f"Analysis complete")
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error analyzing screenshots: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    # Initialize models before starting server
    initialize_models()

    # Run Flask server
    logger.info("Starting Flask server...")
    app.run(host='0.0.0.0', port=5000, debug=False)  # debug=False to avoid reloading models
