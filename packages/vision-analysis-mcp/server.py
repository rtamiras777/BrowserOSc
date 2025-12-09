#!/usr/bin/env python3
"""
Vision Analysis Flask API
PaddleOCR + Claude Haiku (no heavy VLM models)
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import logging
import os
import io
from typing import Dict, Any
from dotenv import load_dotenv
from PIL import Image
import numpy as np

# OCR Import
from paddleocr import PaddleOCR
from anthropic import Anthropic

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for browser extension

# Global instances
ocr_model = None
claude_client = None

def initialize_models():
    """Initialize PaddleOCR and Claude client."""
    global ocr_model, claude_client

    logger.info("Initializing models...")

    try:
        # Initialize PaddleOCR
        logger.info("Loading PaddleOCR...")
        ocr_model = PaddleOCR(lang='en')
        logger.info("✓ PaddleOCR loaded")

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
    result = ocr_model.ocr(image_np)

    # Parse results
    extracted_text = []
    if result and result[0]:
        for line in result[0]:
            # line structure: [bbox, (text, confidence)]
            bbox = line[0]
            text_info = line[1]

            # Handle both tuple and string formats
            if isinstance(text_info, tuple) and len(text_info) >= 2:
                text = text_info[0]
                confidence = text_info[1]
            elif isinstance(text_info, str):
                text = text_info
                confidence = 1.0
            else:
                text = str(text_info)
                confidence = 1.0

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

def analyze_with_claude(ocr_results: Dict) -> Dict[str, Any]:
    """Send OCR text to Claude Haiku for structured analysis."""
    logger.info("Sending to Claude Haiku for analysis...")

    if not claude_client:
        logger.warning("Claude client not initialized")
        return {
            "error": "Claude API key not configured",
            "ocr_text": ocr_results["full_text"][:500]
        }

    prompt = f"""You are analyzing a dashboard/webpage. Here's the OCR extracted text:

{ocr_results['full_text']}

Based on this text, return a JSON object with this structure:
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
  "critical_issues": ["list of critical problems"],
  "key_insights": ["important insights"],
  "recommendations": ["actionable recommendations"]
}}

Rules:
- Extract max 6 key_metrics (most important only)
- Max 3 critical_issues, 3 key_insights, 3 recommendations
- Be specific with numbers
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
        import re

        # Remove markdown code blocks
        response_text = response_text.replace('```json\n', '').replace('```json', '').replace('```', '').strip()

        # Try to extract JSON if there's extra text
        # Look for content between first { and last }
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            response_text = json_match.group(0)

        analysis = json.loads(response_text)

        logger.info("Claude analysis complete")
        return analysis

    except Exception as e:
        logger.error(f"Claude analysis failed: {e}")
        return {
            "error": f"Claude analysis failed: {str(e)}",
            "page_title": "Analysis Error",
            "health_status": "unknown",
            "ocr_text": ocr_results["full_text"][:500]
        }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    models_loaded = {
        "ocr": ocr_model is not None,
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
    Analyze dashboard screenshots with PaddleOCR + Claude Haiku.

    Pipeline: Screenshot → PaddleOCR (text extraction) → Claude Haiku (analysis) → Structured JSON
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
        if not ocr_model:
            return jsonify({
                "success": False,
                "error": "OCR model not loaded. Please wait for initialization."
            }), 503

        # Process first screenshot
        screenshot_b64 = screenshots[0]

        # Decode image
        logger.info("Decoding image...")
        image = decode_base64_image(screenshot_b64)

        # Step 1: Extract text with OCR
        ocr_results = extract_text_with_ocr(image)

        # Step 2: Analyze with Claude Haiku
        final_analysis = analyze_with_claude(ocr_results)

        # Return structured result
        result = {
            "success": True,
            "screenshots_analyzed": len(screenshots),
            "analysis": final_analysis,
            "pipeline": {
                "ocr_elements": len(ocr_results["elements"]),
                "ocr_text_length": len(ocr_results["full_text"])
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
    app.run(host='0.0.0.0', port=5000, debug=False)
