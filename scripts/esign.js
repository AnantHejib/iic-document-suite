/**
 * Electronic Signature (E-Sign) Drawing, Image Upload & Management System
 * Supports multi-signatory signature capture with transparent PNG export
 */

window.EsignManager = {
  currentSignatoryIndex: null,
  isDrawing: false,
  lastX: 0,
  lastY: 0,
  canvas: null,
  ctx: null,
  penColor: '#002060',
  penWidth: 2.5,

  init() {
    this.canvas = document.getElementById('esign-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.bindEvents();
  },

  bindEvents() {
    const canvas = this.canvas;
    const ctx = this.ctx;

    // Mouse events
    canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    canvas.addEventListener('mousemove', (e) => this.draw(e));
    canvas.addEventListener('mouseup', () => this.stopDrawing());
    canvas.addEventListener('mouseleave', () => this.stopDrawing());

    // Touch events for tablets / laptops
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const mouseEvent = new MouseEvent('mouseup', {});
      canvas.dispatchEvent(mouseEvent);
    });

    // File upload
    const uploadInput = document.getElementById('esign-file-upload');
    if (uploadInput) {
      uploadInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }
  },

  openModal(signatoryIndex) {
    this.currentSignatoryIndex = signatoryIndex;
    const modal = document.getElementById('esign-modal');
    if (!modal) return;
    modal.classList.add('active');
    
    // Set signatory label
    const signNameEl = document.getElementById('esign-modal-target-name');
    const signer = window.AppState.currentLetter.signatories[signatoryIndex];
    if (signNameEl && signer) {
      signNameEl.textContent = signer.name || `Signatory #${signatoryIndex + 1}`;
    }

    this.resizeCanvas();
    this.clearCanvas();

    // If existing signature exists, draw it
    if (signer && signer.esignData) {
      const img = new Image();
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      };
      img.src = signer.esignData;
    }
  },

  closeModal() {
    const modal = document.getElementById('esign-modal');
    if (modal) modal.classList.remove('active');
    this.currentSignatoryIndex = null;
  },

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  },

  getCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  },

  startDrawing(e) {
    this.isDrawing = true;
    const { x, y } = this.getCoordinates(e);
    this.lastX = x;
    this.lastY = y;
  },

  draw(e) {
    if (!this.isDrawing) return;
    const { x, y } = this.getCoordinates(e);

    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(this.lastX, this.lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = this.penColor;
    ctx.lineWidth = this.penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    this.lastX = x;
    this.lastY = y;
  },

  stopDrawing() {
    this.isDrawing = false;
  },

  clearCanvas() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },

  setPenColor(color) {
    this.penColor = color;
  },

  setPenWidth(width) {
    this.penWidth = parseFloat(width);
  },

  handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        this.clearCanvas();
        // Draw centered and scaled
        const ratio = Math.min(
          (this.canvas.width / (window.devicePixelRatio || 1)) / img.width,
          (this.canvas.height / (window.devicePixelRatio || 1)) / img.height
        );
        const nw = img.width * ratio * 0.85;
        const nh = img.height * ratio * 0.85;
        const nx = ((this.canvas.width / (window.devicePixelRatio || 1)) - nw) / 2;
        const ny = ((this.canvas.height / (window.devicePixelRatio || 1)) - nh) / 2;
        this.ctx.drawImage(img, nx, ny, nw, nh);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  },

  generateScriptSignature() {
    const signer = window.AppState.currentLetter.signatories[this.currentSignatoryIndex];
    const name = signer ? signer.name : "Dr. Authorized Signatory";
    this.clearCanvas();
    const ctx = this.ctx;
    ctx.font = 'italic 38px "Brush Script MT", "Caveat", "Segoe Script", cursive';
    ctx.fillStyle = this.penColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cw = this.canvas.width / (window.devicePixelRatio || 1);
    const ch = this.canvas.height / (window.devicePixelRatio || 1);
    ctx.fillText(name, cw / 2, ch / 2);
  },

  saveSignature() {
    if (this.currentSignatoryIndex === null) return;
    const dataUrl = this.canvas.toDataURL('image/png');
    
    // Check if canvas has any drawings
    const pixelBuffer = new Uint32Array(
      this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data.buffer
    );
    const hasDrawn = pixelBuffer.some(color => color !== 0);

    if (hasDrawn) {
      window.AppState.currentLetter.signatories[this.currentSignatoryIndex].esignData = dataUrl;
      window.AppState.currentLetter.signatories[this.currentSignatoryIndex].hasEsign = true;
    }

    this.closeModal();
    window.renderDocumentPreview();
    window.updateSignatoryUI();
  },

  removeSignature(index) {
    if (window.AppState.currentLetter.signatories[index]) {
      window.AppState.currentLetter.signatories[index].esignData = null;
      window.AppState.currentLetter.signatories[index].hasEsign = false;
      window.renderDocumentPreview();
      window.updateSignatoryUI();
    }
  }
};
