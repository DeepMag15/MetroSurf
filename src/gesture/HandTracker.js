/* =========================================================================
   METRO SURF - HAND TRACKER
   Handles webcam access and MediaPipe Hands landmark detection.
   ========================================================================= */

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

class HandTracker {
  constructor() {
    this.handLandmarker = null;
    this.stream = null;
    this.videoElement = null;
    this.isInitialized = false;
    this.isLoading = false;
    this.lastVideoTime = -1;
  }

  /**
   * Initializes the MediaPipe FilesetResolver and HandLandmarker model.
   * Loads WASM binaries and model assets from Google CDN for reliability and speed.
   */
  async init() {
    if (this.isInitialized || this.isLoading) return;
    this.isLoading = true;

    try {
      console.log('Initializing MediaPipe Hand Tracker...');
      
      // Initialize the FilesetResolver pointing to jsdelivr CDN for WASM assets
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Create the HandLandmarker instance configured for single-hand detection in Video mode
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 1
      });

      this.isInitialized = true;
      this.isLoading = false;
      console.log('MediaPipe Hand Tracker initialized successfully.');
    } catch (error) {
      this.isLoading = false;
      console.error('Failed to initialize MediaPipe Hand Landmarker:', error);
      throw error;
    }
  }

  /**
   * Starts the user's webcam and binds it to the specified video element.
   * @param {HTMLVideoElement} videoElement The video element to display camera feed.
   */
  async startWebcam(videoElement) {
    if (!videoElement) {
      throw new Error('Video element is required to start webcam.');
    }
    this.videoElement = videoElement;

    // Stop existing stream if running
    this.stopWebcam();

    try {
      // Access the camera with an optimal, lightweight resolution
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user' // Front camera
        },
        audio: false // No audio needed
      });

      this.videoElement.srcObject = this.stream;
      
      // We must set playsInline, muted, and autoplay to ensure playback on all platforms
      this.videoElement.setAttribute('playsinline', '');
      this.videoElement.muted = true;
      
      // Wait for the video to load metadata and begin playing
      return new Promise((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play()
            .then(() => {
              console.log('Webcam stream started successfully.');
              resolve(this.stream);
            })
            .catch((err) => {
              console.error('Video play failed:', err);
              resolve(null);
            });
        };
      });
    } catch (error) {
      console.error('Error accessing webcam:', error);
      throw error;
    }
  }

  /**
   * Stops the webcam and releases all stream tracks.
   */
  stopWebcam() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    console.log('Webcam stream stopped.');
  }

  /**
   * Run hand detection on the current video frame.
   * @returns {Object|null} Detection results or null if no model/new frame.
   */
  detectFrame() {
    if (!this.isInitialized || !this.handLandmarker || !this.videoElement) {
      return null;
    }

    // Check if video is loaded and contains new frame data
    const timestamp = performance.now();
    if (
      this.videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      this.videoElement.currentTime !== this.lastVideoTime
    ) {
      this.lastVideoTime = this.videoElement.currentTime;
      
      // Perform landmarker detection for the current video frame
      return this.handLandmarker.detectForVideo(this.videoElement, timestamp);
    }

    return null;
  }
}

export default HandTracker;
