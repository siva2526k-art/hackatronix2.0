import os
import urllib.request

def download_yolov8n_model():
    """Downloads YOLOv8n pretrained weights if missing."""
    model_dir = "models"
    model_path = os.path.join(model_dir, "yolov8n.pt")
    
    if not os.path.exists(model_dir):
        os.makedirs(model_dir, exist_ok=True)
        
    if not os.path.exists(model_path):
        print(f"[ModelLoader] Model file {model_path} not found. Auto-downloading YOLOv8n weights...")
        url = "https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt"
        try:
            urllib.request.urlretrieve(url, model_path)
            print(f"[ModelLoader] Download complete: {model_path}")
        except Exception as e:
            print(f"[ModelLoader] Download failed: {e}. Will use hybrid OpenCV detection engine.")

if __name__ == "__main__":
    download_yolov8n_model()
