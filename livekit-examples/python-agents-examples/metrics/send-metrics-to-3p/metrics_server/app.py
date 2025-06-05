from flask import Flask, request, jsonify, render_template
import json
import os
from datetime import datetime
from collections import defaultdict
from pathlib import Path

# Set up the Flask app with proper template directory
template_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'templates'))
app = Flask(__name__, template_folder=template_dir)

# Store metrics in memory (for simplicity)
metrics_data = defaultdict(list)
metrics_types = ["llm", "stt", "tts", "eou", "vad"]

@app.route('/metrics/<metric_type>', methods=['POST'])
def receive_metrics(metric_type):
    """
    Endpoint to receive metrics data from the LiveKit agent
    """
    if metric_type not in metrics_types:
        return jsonify({"error": f"Invalid metric type: {metric_type}"}), 400
    
    data = request.json
    # Add timestamp for when server received it
    data['received_at'] = datetime.now().isoformat()
    metrics_data[metric_type].append(data)
    
    # Limit the size of stored metrics (keep only last 100 entries per type)
    if len(metrics_data[metric_type]) > 100:
        metrics_data[metric_type] = metrics_data[metric_type][-100:]
    
    return jsonify({"status": "success"}), 200

@app.route('/')
def dashboard():
    """Display metrics dashboard"""
    return render_template('dashboard.html', metrics_types=metrics_types)

@app.route('/api/metrics')
def get_metrics():
    """API endpoint to get all metrics data for AJAX requests"""
    return jsonify(metrics_data)

@app.route('/api/metrics/<metric_type>')
def get_metric_type(metric_type):
    """API endpoint to get metrics data for a specific type"""
    if metric_type not in metrics_types:
        return jsonify({"error": f"Invalid metric type: {metric_type}"}), 400
    
    return jsonify(metrics_data[metric_type])

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001) 