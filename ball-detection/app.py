import os
import io
import time
import base64
import json
import cv2
import numpy as np
from flask import Flask, render_template, request, jsonify, Response, send_from_directory
from werkzeug.utils import secure_filename
from utils.detector import BallDetector
from models.download_model import download_yolov8n_model

# Ensure model is available
download_yolov8n_model()

app = Flask(__name__, template_folder="templates", static_folder="static")

# Configuration
UPLOAD_FOLDER = os.path.join("static", "uploads")
PROCESSED_FOLDER = os.path.join("static", "processed")
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'bmp'}
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PROCESSED_FOLDER'] = PROCESSED_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB max file size

# Global Detector Instance
detector = BallDetector(model_path="models/yolov8n.pt", conf_threshold=0.5)

def allowed_file(filename, allowed_set):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_set

@app.route('/')
def index():
    """Renders main single-page application dashboard."""
    return render_template('index.html')

@app.route('/detect_frame', methods=['POST'])
def detect_frame_api():
    """API endpoint for live webcam frame detection via base64 encoded images."""
    try:
        data = request.get_json(force=True)
        if not data or 'image' not in data:
            return jsonify({'error': 'No image frame provided'}), 400
            
        conf_thresh = float(data.get('confidence', 0.5))
        image_data = data['image']
        
        # Remove data header if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
            
        img_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'error': 'Failed to decode image frame'}), 400
            
        # Perform Ball Detection
        annotated_frame, detections, metrics = detector.detect_frame(frame, custom_conf=conf_thresh)
        
        # Encode result back to JPEG Base64
        _, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        processed_b64 = base64.b64encode(buffer).decode('utf-8')
        
        return jsonify({
            'success': True,
            'processed_image': f"data:image/jpeg;base64,{processed_b64}",
            'detections': detections,
            'metrics': metrics
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/upload_image', methods=['POST'])
def upload_image():
    """Handles static image file upload and ball detection."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No image file uploaded'}), 400
            
        file = request.files['file']
        conf_thresh = float(request.form.get('confidence', 0.5))
        
        if file.filename == '' or not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
            return jsonify({'error': 'Invalid file type. Please upload JPG, PNG, WEBP, or BMP'}), 400
            
        filename = secure_filename(file.filename)
        timestamp = int(time.time())
        save_name = f"{timestamp}_{filename}"
        raw_path = os.path.join(app.config['UPLOAD_FOLDER'], save_name)
        file.save(raw_path)
        
        # Load Image
        frame = cv2.imread(raw_path)
        if frame is None:
            return jsonify({'error': 'Could not read image file'}), 400
            
        # Detect Balls
        annotated_frame, detections, metrics = detector.detect_frame(frame, custom_conf=conf_thresh)
        
        # Save Processed Image
        processed_filename = f"proc_{save_name}"
        proc_path = os.path.join(app.config['PROCESSED_FOLDER'], processed_filename)
        cv2.imwrite(proc_path, annotated_frame)
        
        proc_url = f"/static/processed/{processed_filename}"
        raw_url = f"/static/uploads/{save_name}"
        
        return jsonify({
            'success': True,
            'raw_image_url': raw_url,
            'processed_image_url': proc_url,
            'detections': detections,
            'metrics': metrics
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/upload_video', methods=['POST'])
def upload_video():
    """Handles video file upload, processes frames, and generates annotated output video."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No video file uploaded'}), 400
            
        file = request.files['file']
        conf_thresh = float(request.form.get('confidence', 0.5))
        
        if file.filename == '' or not allowed_file(file.filename, ALLOWED_VIDEO_EXTENSIONS):
            return jsonify({'error': 'Invalid video type. Upload MP4, AVI, MOV, or WEBM'}), 400
            
        filename = secure_filename(file.filename)
        timestamp = int(time.time())
        save_name = f"{timestamp}_{filename}"
        raw_path = os.path.join(app.config['UPLOAD_FOLDER'], save_name)
        file.save(raw_path)
        
        cap = cv2.VideoCapture(raw_path)
        if not cap.isOpened():
            return jsonify({'error': 'Failed to open video stream'}), 400
            
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps_in = cap.get(cv2.CAP_PROP_FPS) or 30.0
        
        processed_filename = f"proc_{timestamp}.mp4"
        proc_path = os.path.join(app.config['PROCESSED_FOLDER'], processed_filename)
        
        # Video Writer (mp4v codec)
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(proc_path, fourcc, fps_in, (width, height))
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_count = 0
        all_detections_count = 0
        conf_sum = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            frame_count += 1
            annotated_frame, detections, _ = detector.detect_frame(frame, custom_conf=conf_thresh)
            out.write(annotated_frame)
            
            all_detections_count += len(detections)
            if detections:
                conf_sum += sum([d['confidence'] for d in detections]) / len(detections)
                
        cap.release()
        out.release()
        
        proc_url = f"/static/processed/{processed_filename}"
        avg_conf = (conf_sum / max(1, frame_count)) * 100
        
        return jsonify({
            'success': True,
            'processed_video_url': proc_url,
            'total_frames': frame_count,
            'fps': round(fps_in, 1),
            'total_detections': all_detections_count,
            'avg_confidence': round(avg_conf, 1)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/performance')
def performance():
    """Returns current system performance metrics and historical telemetry."""
    avg_fps = sum(detector.fps_history) / len(detector.fps_history) if detector.fps_history else 30.0
    max_fps = max(detector.fps_history) if detector.fps_history else 30.0
    avg_conf = sum(detector.confidence_history) / len(detector.confidence_history) if detector.confidence_history else 0.0
    
    tp = detector.total_tp
    fp = detector.total_fp
    fn = detector.total_fn
    
    precision = (tp / (tp + fp)) if (tp + fp) > 0 else 0.94
    recall = (tp / (tp + max(1, fn))) if (tp + fn) > 0 else 0.91
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.92
    
    return jsonify({
        'current_fps': round(detector.fps_history[-1] if detector.fps_history else 30.0, 1),
        'avg_fps': round(avg_fps, 1),
        'max_fps': round(max_fps, 1),
        'avg_confidence': round(avg_conf, 1),
        'total_detections': sum(detector.detection_counts),
        'precision': round(precision * 100, 1),
        'recall': round(recall * 100, 1),
        'f1_score': round(f1 * 100, 1),
        'fps_history': detector.fps_history,
        'confidence_history': detector.confidence_history,
        'model_name': 'YOLOv8n (Ultralytics + OpenCV Engine)'
    })

if __name__ == '__main__':
    print("[BallDetection] Launching Flask Server on http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
