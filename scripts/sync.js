/**
 * IIC DocCraft Pro - Multi-Device Live Synchronization System
 * Enables real-time synchronization across multiple computers, laptops, and mobile devices
 * Supports Local Wi-Fi (LAN), Global Public Internet Tunnel (localtunnel), and Firebase Cloud Database
 */

window.SyncManager = {
  isServerOnline: false,
  localDbVersion: 0,
  pollInterval: null,
  networkInfo: null,
  syncStatusEl: null,

  init() {
    this.syncStatusEl = document.getElementById('sync-status-badge');
    this.checkServerConnection();
    this.startLiveHeartbeat();
    this.initFirebaseSyncIfConfigured();
  },

  getServerBaseUrl() {
    const custom = localStorage.getItem('iic_custom_server_url');
    if (custom) return custom.trim().replace(/\/+$/, '');
    // Automatically connect to our live 24/7 Render cloud backend if running on GitHub Pages or local file
    if (window.location.hostname.includes('github.io') || window.location.protocol === 'file:') {
      return 'https://iic-document-suite.onrender.com';
    }
    return '';
  },

  setServerBaseUrl(url) {
    if (url && url.trim()) {
      let cleanUrl = url.trim().replace(/\/+$/, '');
      if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;
      localStorage.setItem('iic_custom_server_url', cleanUrl);
      window.showToast('Connecting to Backend Server: ' + cleanUrl, 'info');
    } else {
      localStorage.removeItem('iic_custom_server_url');
      window.showToast('Reset to default cloud server connection.', 'info');
    }
    this.checkServerConnection();
  },

  async checkServerConnection() {
    const baseUrl = this.getServerBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/api/network-info`, { method: 'GET', cache: 'no-store' });
      if (response.ok) {
        this.networkInfo = await response.json();
        this.isServerOnline = true;
        this.updateStatusBadge(true);
        // Initial sync from server database
        await this.pullLettersFromServer();
      } else {
        this.isServerOnline = false;
        this.updateStatusBadge(false);
      }
    } catch (e) {
      // Opened via static hosting without backend connected
      this.isServerOnline = false;
      this.updateStatusBadge(false);
    }
  },

  updateStatusBadge(online) {
    if (!this.syncStatusEl) return;
    if (online) {
      const isRender = window.location.hostname.includes('render.com') || this.getServerBaseUrl().includes('render.com');
      const isGlobal = this.networkInfo?.isGlobal && this.networkInfo?.globalUrl;
      const labelText = isRender 
        ? '🌐 24/7 Cloud Sync: Live (Worldwide)' 
        : (isGlobal ? '🌐 Global Sync: Live (Any Network)' : '🟢 Multi-Device: Synced (Wi-Fi)');
      this.syncStatusEl.className = 'sync-badge sync-online';
      this.syncStatusEl.innerHTML = `
        <span class="sync-dot dot-online"></span>
        <span>${labelText}</span>
      `;
      this.syncStatusEl.title = `Connected to live central cloud database at ${this.getServerBaseUrl() || this.networkInfo?.networkUrl || 'server'}. All devices are synchronized!`;
    } else {
      const fbUrl = this.getFirebaseUrl();
      if (fbUrl) {
        this.syncStatusEl.className = 'sync-badge sync-online';
        this.syncStatusEl.innerHTML = `
          <span class="sync-dot dot-online"></span>
          <span>☁️ Firebase Cloud Sync: Active</span>
        `;
        this.syncStatusEl.title = `Connected to Firebase Cloud at ${fbUrl}`;
      } else {
        const isGithubPages = window.location.hostname.includes('github.io');
        this.syncStatusEl.className = 'sync-badge sync-offline';
        this.syncStatusEl.innerHTML = `
          <span class="sync-dot dot-offline"></span>
          <span>${isGithubPages ? '⚠️ Offline Mode (Click to Connect)' : 'Standalone / Offline Mode'}</span>
        `;
        this.syncStatusEl.title = isGithubPages 
          ? 'GitHub Pages is static. Click here to connect to your live Python server, localtunnel, or Render cloud backend!'
          : 'Server offline. Run Launch_IIC_Doc_App.bat or click to configure sync.';
      }
    }
  },

  startLiveHeartbeat() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    // Poll server version every 2.5 seconds
    this.pollInterval = setInterval(async () => {
      const baseUrl = this.getServerBaseUrl();
      if (!this.isServerOnline) {
        // Try reconnecting periodically or check Firebase
        await this.checkServerConnection();
        if (this.getFirebaseUrl()) {
          await this.pullFromFirebase();
        }
        return;
      }

      try {
        const res = await fetch(`${baseUrl}/api/version`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.version && data.version > this.localDbVersion) {
            // Remote changes detected from another device
            console.log('SyncManager: Remote changes detected. Version:', data.version);
            await this.pullLettersFromServer(true);
            this.localDbVersion = data.version;
          }
        }
      } catch (e) {
        this.isServerOnline = false;
        this.updateStatusBadge(false);
      }
    }, 2500);
  },

  async pullLettersFromServer(isLiveUpdate = false) {
    try {
      const baseUrl = this.getServerBaseUrl();
      const res = await fetch(`${baseUrl}/api/letters`, { cache: 'no-store' });
      if (!res.ok) return;

      const data = await res.json();
      if (data.success && Array.isArray(data.letters)) {
        this.localDbVersion = data.version || Date.now();
        const serverLetters = data.letters;

        // Save into local archive
        window.ArchiveManager.saveAllLetters(serverLetters);
        window.ArchiveManager.renderArchiveList();

        if (isLiveUpdate) {
          window.showToast('Updated letters from another device in real-time!', 'info');
          
          // Check if current letter was modified on remote device
          const currentId = window.AppState?.currentLetter?.letterId;
          const remoteCurrent = serverLetters.find(l => l.letterId === currentId);
          if (remoteCurrent) {
            const activeEl = document.activeElement;
            const isEditing = activeEl && (activeEl.tagName === 'INPUT' || activeEl.isContentEditable);
            if (!isEditing) {
              window.loadLetterIntoEditor(remoteCurrent);
            }
          }
        }
      }
    } catch (e) {
      console.error('SyncManager: Error pulling letters from server', e);
    }
  },

  async pushLetterToServer(letter, forceAsNew = false) {
    // 1. Push to Python Server if online (local or cloud)
    if (this.isServerOnline) {
      try {
        const baseUrl = this.getServerBaseUrl();
        const res = await fetch(`${baseUrl}/api/letters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ letter, forceAsNew })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            this.localDbVersion = data.version || Date.now();
          }
        }
      } catch (e) {
        console.error('SyncManager: Error pushing letter to server', e);
      }
    }

    // 2. Also push to Firebase Cloud Database if configured
    this.pushToFirebase(letter);
  },

  async deleteLetterFromServer(letterId) {
    if (this.isServerOnline) {
      try {
        const baseUrl = this.getServerBaseUrl();
        const res = await fetch(`${baseUrl}/api/letters/${encodeURIComponent(letterId)}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.version) this.localDbVersion = data.version;
        }
      } catch (e) {
        console.error('SyncManager: Error deleting letter on server', e);
      }
    }

    this.deleteFromFirebase(letterId);
  },

  /* ==========================================================================
     Firebase Cloud Database Integration (Serverless Global Sync)
     ========================================================================== */
  getFirebaseUrl() {
    return localStorage.getItem('iic_firebase_url') || '';
  },

  setFirebaseUrl(url) {
    if (url) {
      let cleanUrl = url.trim().replace(/\/+$/, '');
      if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;
      localStorage.setItem('iic_firebase_url', cleanUrl);
      this.updateStatusBadge(this.isServerOnline);
      this.pullFromFirebase();
      window.showToast('Firebase Cloud Database connected!', 'success');
    } else {
      localStorage.removeItem('iic_firebase_url');
      this.updateStatusBadge(this.isServerOnline);
      window.showToast('Firebase Cloud Database disconnected', 'info');
    }
  },

  async initFirebaseSyncIfConfigured() {
    const fbUrl = this.getFirebaseUrl();
    if (fbUrl) {
      await this.pullFromFirebase();
    }
  },

  async pullFromFirebase() {
    const fbUrl = this.getFirebaseUrl();
    if (!fbUrl) return;

    try {
      const res = await fetch(`${fbUrl}/letters.json`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          const letterArray = Array.isArray(data) ? data : Object.values(data);
          if (letterArray.length > 0) {
            window.ArchiveManager.saveAllLetters(letterArray);
            window.ArchiveManager.renderArchiveList();
          }
        }
      }
    } catch (e) {
      console.warn('Firebase sync notice:', e);
    }
  },

  async pushToFirebase(letter) {
    const fbUrl = this.getFirebaseUrl();
    if (!fbUrl || !letter.letterId) return;

    try {
      const key = letter.letterId.replace(/[\/\.\#\$\[\]]/g, '_');
      await fetch(`${fbUrl}/letters/${key}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(letter)
      });
    } catch (e) {
      console.warn('Firebase push notice:', e);
    }
  },

  async deleteFromFirebase(letterId) {
    const fbUrl = this.getFirebaseUrl();
    if (!fbUrl || !letterId) return;

    try {
      const key = letterId.replace(/[\/\.\#\$\[\]]/g, '_');
      await fetch(`${fbUrl}/letters/${key}.json`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('Firebase delete notice:', e);
    }
  },

  /* ==========================================================================
     Multi-Device Sharing Dialog & QR Code Rendering
     ========================================================================== */
  openMultiDeviceModal() {
    const modal = document.getElementById('multi-device-modal');
    if (!modal) return;

    const globalBox = document.getElementById('network-global-box');
    const globalUrlEl = document.getElementById('network-global-url-text');
    const wifiUrlEl = document.getElementById('network-share-url-text');
    const qrContainer = document.getElementById('network-share-qrcode');
    const qrLabel = document.getElementById('network-qr-target-label');
    const fbInput = document.getElementById('input-firebase-url');

    const globalUrl = this.networkInfo?.globalUrl;
    const wifiUrl = this.networkInfo?.networkUrl || `http://${window.location.hostname || '172.17.242.36'}:3000/index.html`;

    // 1. Populate Wi-Fi URL
    if (wifiUrlEl) wifiUrlEl.textContent = wifiUrl;

    // 2. Populate Global URL if active
    if (globalUrl) {
      if (globalBox) globalBox.style.display = 'flex';
      if (globalUrlEl) globalUrlEl.textContent = globalUrl;
      if (qrLabel) qrLabel.textContent = "Scan for Global Worldwide Access (4G/5G/Any Network)";
    } else {
      if (globalBox) globalBox.style.display = 'none';
      if (qrLabel) qrLabel.textContent = "Scan for College Wi-Fi / Local Access";
    }

    // Target URL for QR Code (prefer global if available, else wifi)
    const targetShareUrl = globalUrl || wifiUrl;

    // 3. Render QR Code
    if (qrContainer) {
      qrContainer.innerHTML = '';
      if (window.QRCode) {
        new QRCode(qrContainer, {
          text: targetShareUrl,
          width: 140,
          height: 140,
          colorDark: "#002060",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      }
    }

    // 4. Populate Firebase URL input
    if (fbInput) {
      fbInput.value = this.getFirebaseUrl();
    }

    // 5. Populate Custom Server URL input
    const serverInput = document.getElementById('input-custom-server-url');
    if (serverInput) {
      serverInput.value = this.getServerBaseUrl();
    }

    modal.classList.add('active');
  },

  closeMultiDeviceModal() {
    const modal = document.getElementById('multi-device-modal');
    if (modal) modal.classList.remove('active');
  },

  copyGlobalLink() {
    const text = this.networkInfo?.globalUrl || document.getElementById('network-global-url-text')?.textContent;
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        window.showToast('Copied Global Worldwide link to clipboard!', 'success');
      }).catch(() => {
        prompt('Copy this Global link to share anywhere in the world:', text);
      });
    }
  },

  copyNetworkLink() {
    const text = this.networkInfo?.networkUrl || document.getElementById('network-share-url-text')?.textContent;
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        window.showToast('Copied Wi-Fi link to clipboard!', 'success');
      }).catch(() => {
        prompt('Copy this Wi-Fi link for devices on the same network:', text);
      });
    }
  },

  saveCustomServerSettings() {
    const input = document.getElementById('input-custom-server-url');
    if (input) {
      this.setServerBaseUrl(input.value);
    }
  },

  clearCustomServerSettings() {
    this.setServerBaseUrl('');
    const input = document.getElementById('input-custom-server-url');
    if (input) input.value = '';
  },

  saveFirebaseSettings() {
    const input = document.getElementById('input-firebase-url');
    if (input) {
      this.setFirebaseUrl(input.value);
    }
  }
};
