FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY server.py .

# Expose Flask API port
EXPOSE 5000

# Run Flask server
CMD ["python", "server.py"]
