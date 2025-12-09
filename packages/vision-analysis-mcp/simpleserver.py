#!/usr/bin/env python3
"""
Simple Vision Analysis Flask API
PaddleOCR only - returns raw OCR results
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import logging
import io
from typing import Dict, Any
from PIL import Image

# OCR Import
from paddleocr import PaddleOCR

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for browser extension

# Global OCR model
ocr_model = None

def initialize_ocr():
    """Initialize PaddleOCR."""
    global ocr_model

    logger.info("Initializing PaddleOCR...")
    try:
        # Initialize exactly like test_ocr.py
        ocr_model = PaddleOCR(
            lang="en",  # English language
            use_doc_orientation_classify=False,  # Disable doc orientation (for speed)
            use_doc_unwarping=False,  # Disable doc unwarping (for speed)
            use_textline_orientation=False  # Disable textline orientation (for speed)
        )
        logger.info("✓ PaddleOCR loaded")
    except Exception as e:
        logger.error(f"Error initializing OCR: {e}")
        raise

def decode_base64_image(base64_string: str) -> Image.Image:
    """Decode base64 string to PIL Image."""
    if base64_string.startswith('data:image'):
        base64_string = base64_string.split(',')[1]

    image_data = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_data))
    return image

def extract_text_with_ocr(image_path: str) -> Dict[str, Any]:
    """Extract text from image using PaddleOCR."""
    print("\n" + "="*80)
    print("STARTING OCR EXTRACTION")
    print("="*80)
    logger.info("Running OCR...")

    # Use predict() method like test_ocr.py
    result = ocr_model.predict(image_path)

    # Parse results exactly like test_ocr.py
    extracted_text = []
    full_text = ""

    # Convert generator to list to actually execute the prediction
    result_list = list(result)
    print(f"DEBUG: Got {len(result_list)} results from OCR")

    for res in result_list:
        # Access JSON data
        json_data = res.json
        print(f"DEBUG: JSON keys: {json_data.keys()}")

        # The actual OCR results are nested in 'res' key
        if 'res' in json_data:
            ocr_data = json_data['res']
            print(f"DEBUG: OCR data keys: {ocr_data.keys()}")

            # Extract text and confidence scores
            if 'rec_texts' in ocr_data:
                texts = ocr_data['rec_texts']
                scores = ocr_data.get('rec_scores', [1.0] * len(texts))
                bboxes = ocr_data.get('rec_boxes', [])

                print(f"DEBUG: Found {len(texts)} text elements")

                for i, (text, score) in enumerate(zip(texts, scores)):
                    bbox = bboxes[i] if i < len(bboxes) else []
                    extracted_text.append({
                        "text": text,
                        "confidence": float(score),
                        "bbox": bbox.tolist() if hasattr(bbox, 'tolist') else bbox
                    })

                # Concatenate all text
                full_text = " ".join(texts)
            else:
                print("DEBUG: 'rec_texts' not found in ocr_data")
        else:
            print("DEBUG: 'res' not found in json_data")

    logger.info(f"OCR extracted {len(extracted_text)} text elements")

    return {
        "full_text": full_text,
        "elements": extracted_text
    }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "vision-analysis-simple",
        "ocr_ready": ocr_model is not None
    })

@app.route('/analyze', methods=['POST'])
def analyze_image():
    """
    Extract text from images using PaddleOCR.

    Returns raw OCR results as JSON.
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

        # Check if OCR is loaded
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

        # Debug: Save the image and print info
        print(f"\n🖼️ IMAGE DEBUG INFO:")
        print(f"  - Image size: {image.size}")
        print(f"  - Image mode: {image.mode}")
        print(f"  - Image format: {image.format}")

        # Save image to file for OCR processing
        debug_path = "/Users/ridhi/Documents/browserOS2/BrowserOSc/packages/vision-analysis-mcp/debug_image.png"
        image.save(debug_path)
        print(f"  - Saved to: {debug_path}")
        print()

        # Extract text with OCR (pass file path, not PIL image)
        ocr_results = extract_text_with_ocr(debug_path)

        # Log the extracted text to terminal
        print("\n" + "=" * 80)
        print("OCR RESULTS:")
        print(f"Full text extracted: {ocr_results['full_text']}")
        print("-" * 80)
        print(f"Number of text elements: {len(ocr_results['elements'])}")
        for i, element in enumerate(ocr_results['elements'][:10]):  # Show first 10 elements
            print(f"  [{i+1}] Text: '{element['text']}' (confidence: {element['confidence']:.2f})")
        if len(ocr_results['elements']) > 10:
            print(f"  ... and {len(ocr_results['elements']) - 10} more elements")
        print("=" * 80 + "\n")

        # Return results in format expected by frontend
        # Frontend expects result.analysis
        result = {
            "success": True,
            "screenshots_analyzed": len(screenshots),
            "ocr_results": ocr_results,
            "analysis": {
                "page_title": "OCR Analysis (Simple Server)",
                "primary_purpose": "Raw OCR text extraction",
                "health_status": "unknown",
                "key_metrics": [],
                "alerts": [],
                "charts": [],
                "critical_issues": [],
                "key_insights": [f"Extracted {len(ocr_results['elements'])} text elements"],
                "recommendations": ["Upgrade to full analysis with Claude for structured insights"],
                "ocr_text": ocr_results['full_text']
            },
            "pipeline": {
                "ocr_elements": len(ocr_results['elements']),
                "ocr_text_length": len(ocr_results['full_text'])
            }
        }

        logger.info(f"OCR complete - extracted {len(ocr_results['elements'])} elements")
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error analyzing screenshots: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    # Initialize OCR before starting server
    initialize_ocr()

    # Run Flask server
    logger.info("Starting simple Flask server...")
    app.run(host='0.0.0.0', port=5000, debug=False)
