#!/usr/bin/env python3
"""
Test PaddleOCR with proper API usage based on official docs
"""
from paddleocr import PaddleOCR

print("Initializing PaddleOCR...")
# Initialize PaddleOCR with English language
ocr = PaddleOCR(
    lang="en",  # English language
    use_doc_orientation_classify=False,  # Disable doc orientation (for speed)
    use_doc_unwarping=False,  # Disable doc unwarping (for speed)
    use_textline_orientation=False  # Disable textline orientation (for speed)
)

print("Running OCR on debug_image.png...")
img_path = "debug_image.png"

# Use predict() method as per official docs
result = ocr.predict(img_path)

print("\n" + "="*80)
print("OCR RESULTS:")
print("="*80)

# Process results
for res in result:
    # Print to terminal
    res.print()

    # Access JSON data
    json_data = res.json

    print("\n" + "-"*80)
    print("EXTRACTED TEXT ELEMENTS:")
    print("-"*80)

    # Extract text and confidence scores
    if 'rec_texts' in json_data:
        texts = json_data['rec_texts']
        scores = json_data.get('rec_scores', [1.0] * len(texts))

        print(f"\nFound {len(texts)} text regions:\n")
        for i, (text, score) in enumerate(zip(texts, scores), 1):
            print(f"[{i}] {text} (confidence: {score:.4f})")

        # Concatenate all text
        full_text = " ".join(texts)
        print("\n" + "="*80)
        print("FULL TEXT:")
        print("="*80)
        print(full_text)
    else:
        print("No text detected!")

    # Save visualization
    res.save_to_img("ocr_output")
    print(f"\nVisualization saved to: ocr_output/{img_path}")
