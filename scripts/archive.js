/**
 * Letter Registry & Document Archive System
 * Provides unique Letter ID management, persistent storage, search, duplicate, and export/import
 * Guaranteed never to accidentally overwrite other documents!
 */

window.ArchiveManager = {
  STORAGE_KEY: 'iic_documents_archive',
  SETTINGS_KEY: 'iic_system_settings',

  getSettings() {
    const defaultSettings = {
      idPrefix: 'LSIT/IIC',
      academicYear: '2627',
      nextSerial: 1,
      defaultSignatories: [
        { name: "Dr. M. S. Chaudhari", designation: "R&D DEAN & IIC PRESIDENT" },
        { name: "Dr. P. S. Patil", designation: "Head of Department FE" }
      ]
    };
    try {
      const stored = localStorage.getItem(this.SETTINGS_KEY);
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch (e) {
      return defaultSettings;
    }
  },

  saveSettings(settings) {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings', e);
    }
  },

  generateNextLetterId() {
    const letters = this.getAllLetters();
    const settings = this.getSettings();
    
    // Find the highest serial number ever used among all saved letters
    let maxSerial = settings.nextSerial || 1;
    letters.forEach(l => {
      if (l.letterId) {
        const match = l.letterId.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= maxSerial) {
            maxSerial = num + 1;
          }
        }
      }
    });

    settings.nextSerial = maxSerial;
    this.saveSettings(settings);

    const serialStr = String(maxSerial).padStart(3, '0');
    return `${settings.idPrefix}/${settings.academicYear}/${serialStr}`;
  },

  incrementLetterSerial() {
    return this.generateNextLetterId();
  },

  getAllLetters() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        // Seed with official sample if empty
        const initial = [this.getSampleLetter()];
        this.saveAllLetters(initial);
        return initial;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [this.getSampleLetter()];
    } catch (e) {
      console.error('Error loading archive', e);
      return [this.getSampleLetter()];
    }
  },

  saveAllLetters(letters) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(letters));
    } catch (e) {
      console.error('Error saving archive', e);
    }
  },

  /**
   * Check if a letter ID already exists in the archive
   */
  isLetterIdExisting(letterId) {
    if (!letterId) return false;
    const letters = this.getAllLetters();
    return letters.some(l => (l.letterId || '').trim().toLowerCase() === letterId.trim().toLowerCase());
  },

  /**
   * Save letter with full safety against overwriting
   * @param {Object} letter
   * @param {Boolean} forceAsNew If true, always saves as a brand-new letter with a new ID
   */
  saveLetter(letter, forceAsNew = false) {
    let letters = this.getAllLetters();
    let letterToSave = JSON.parse(JSON.stringify(letter));
    const now = new Date().toISOString();

    if (forceAsNew) {
      // If forcing as new, ensure ID doesn't collide with existing letters
      if (this.isLetterIdExisting(letterToSave.letterId)) {
        letterToSave.letterId = this.generateNextLetterId();
      }
      letterToSave.id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      letterToSave.createdAt = now;
      letterToSave.updatedAt = now;
      letters.unshift(letterToSave);
    } else {
      // Find matching letter strictly by exact Letter ID (never by internal id)
      const existingIndex = letters.findIndex(l => (l.letterId || '').trim().toLowerCase() === (letterToSave.letterId || '').trim().toLowerCase());

      if (existingIndex >= 0) {
        // Explicitly updating the existing letter with this Letter ID
        letterToSave.createdAt = letters[existingIndex].createdAt || now;
        letterToSave.id = letters[existingIndex].id || ('doc_' + Date.now());
        letterToSave.updatedAt = now;
        letters[existingIndex] = letterToSave;
      } else {
        // It is a new letter ID!
        letterToSave.id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        letterToSave.createdAt = now;
        letterToSave.updatedAt = now;
        letters.unshift(letterToSave);
      }
    }

    // Sync serial counter in settings
    const match = letterToSave.letterId.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      const settings = this.getSettings();
      if (num >= settings.nextSerial) {
        settings.nextSerial = num + 1;
        this.saveSettings(settings);
      }
    }

    this.saveAllLetters(letters);
    this.renderArchiveList();

    // Push to server for multi-device sync
    if (window.SyncManager && window.SyncManager.isServerOnline) {
      window.SyncManager.pushLetterToServer(letterToSave, forceAsNew);
    }

    // Update active state in app
    window.AppState.currentLetter = letterToSave;
    const idInput = document.getElementById('input-letter-id');
    if (idInput) idInput.value = letterToSave.letterId;
    const navBadge = document.getElementById('nav-current-letter-id');
    if (navBadge) navBadge.textContent = letterToSave.letterId;

    return letterToSave;
  },

  deleteLetter(letterId) {
    if (!confirm(`Are you sure you want to delete letter [${letterId}]?`)) return false;
    let letters = this.getAllLetters();
    letters = letters.filter(l => l.letterId !== letterId);
    this.saveAllLetters(letters);
    this.renderArchiveList();

    if (window.SyncManager && window.SyncManager.isServerOnline) {
      window.SyncManager.deleteLetterFromServer(letterId);
    }

    window.showToast(`Deleted ${letterId}`, 'info');
    return true;
  },

  duplicateLetter(letterId) {
    const letters = this.getAllLetters();
    const source = letters.find(l => l.letterId === letterId);
    if (!source) return;

    const newId = this.incrementLetterSerial();
    const cloned = JSON.parse(JSON.stringify(source));
    cloned.id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    cloned.letterId = newId;
    cloned.subject = (cloned.subject || 'Letter') + ' (Copy)';
    cloned.createdAt = new Date().toISOString();
    cloned.updatedAt = cloned.createdAt;

    letters.unshift(cloned);
    this.saveAllLetters(letters);
    this.renderArchiveList();

    if (window.SyncManager && window.SyncManager.isServerOnline) {
      window.SyncManager.pushLetterToServer(cloned, true);
    }

    // Load duplicated letter into editor
    window.loadLetterIntoEditor(cloned);
    window.showToast(`Duplicated as new letter: ${newId}`, 'success');
  },

  getSampleLetter() {
    const template = window.IIC_TEMPLATES ? window.IIC_TEMPLATES[0] : null;
    return {
      id: 'doc_sample_001',
      letterId: 'LSIT/IIC/2627/001',
      date: '2026-10-01',
      dateFormatted: '01/10/2026',
      recipient: {
        name: 'Dr. P. S. Patil',
        designation: 'Head of Department, First-Year Engineering',
        institution: 'Sinhgad Institute of Technology, Lonavala'
      },
      salutation: 'Respected Sir,',
      subject: 'Permission to Conduct Classroom Publicity for “Drone Workshop 2026”',
      content: template ? template.content : `<p>We hope you are doing well.</p>
<p>Team IIC is organizing <strong>“Drone Workshop 2026”</strong> exclusively for First-Year Engineering students on <strong>3 October 2026</strong>. The workshop aims to develop enthusiasm and passion for practical engineering among students by providing them with an opportunity to explore <strong>drone technology, computer engineering, and various other engineering domains</strong> through hands-on learning.</p>
<p>This workshop also marks the beginning of a <strong>new era for the fourth generation of Team IIC</strong>. Through this initiative, we aim to foster innovation, creativity, technical curiosity, and active participation among First-Year Engineering students.</p>
<p>To create awareness about the workshop and encourage student participation, we would like to conduct a brief <strong>classroom publicity campaign</strong> in the First-Year Engineering classrooms. We assure you that the classroom visits will be conducted for a short duration and will be planned in a manner that causes minimal disruption to regular academic activities.</p>
<p>We kindly request your <strong>permission and support to visit the FE classrooms</strong> and promote the workshop at a suitable time as per the department's convenience.</p>
<p>We would be grateful for your consideration and support.</p>
<p><strong>Thank you.</strong></p>`,
      signoff: 'Yours sincerely,',
      entity: 'Team IIC',
      organization: 'Sinhgad Institute of Technology, Lonavala',
      signatories: [
        {
          name: 'Dr. M. S. Chaudhari',
          designation: 'R&D DEAN & IIC PRESIDENT',
          hasEsign: false,
          esignData: null
        },
        {
          name: 'Dr. P. S. Patil',
          designation: 'Head of Department FE',
          hasEsign: false,
          esignData: null
        }
      ],
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z'
    };
  },

  renderArchiveList(filterQuery = '') {
    const container = document.getElementById('archive-letter-list');
    const countBadge = document.getElementById('archive-count-badge');
    if (!container) return;

    const letters = this.getAllLetters();
    const query = filterQuery.toLowerCase().trim();

    const filtered = letters.filter(l => {
      if (!query) return true;
      const idMatch = (l.letterId || '').toLowerCase().includes(query);
      const recipientMatch = (l.recipient?.name || '').toLowerCase().includes(query);
      const subjectMatch = (l.subject || '').toLowerCase().includes(query);
      return idMatch || recipientMatch || subjectMatch;
    });

    if (countBadge) countBadge.textContent = filtered.length;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-archive-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
          <p>No matching letters found</p>
          <small>Change your search or create a new letter ID</small>
        </div>
      `;
      return;
    }

    const currentId = window.AppState?.currentLetter?.letterId;

    container.innerHTML = filtered.map(item => {
      const isSelected = item.letterId === currentId;
      const dateDisplay = item.dateFormatted || item.date || 'Recent';
      const cleanSubject = (item.subject || 'Untitled Letter').replace(/^Subject:\s*/i, '');
      const recipientName = item.recipient?.name || 'Anyone (Recipient)';
      const recipientDept = item.recipient?.designation || '';

      return `
        <div class="archive-card ${isSelected ? 'active-card' : ''}" data-id="${item.letterId}">
          <div class="archive-card-header">
            <span class="letter-id-tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="16" rx="2"/>
                <line x1="7" y1="8" x2="17" y2="8"/>
                <line x1="7" y1="12" x2="17" y2="12"/>
              </svg>
              ${item.letterId}
            </span>
            <span class="letter-date-tag">${dateDisplay}</span>
          </div>

          <h4 class="archive-card-title" title="${cleanSubject}">${cleanSubject}</h4>
          
          <div class="archive-card-meta">
            <span class="archive-recipient-name"><strong>To:</strong> ${recipientName}</span>
            ${recipientDept ? `<span class="archive-recipient-dept">${recipientDept}</span>` : ''}
          </div>

          <div class="archive-card-actions">
            <button class="btn-card-action btn-load" onclick="window.loadLetterById('${item.letterId}')" title="Load into Editor & Preview">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Open
            </button>
            <button class="btn-card-action btn-duplicate" onclick="window.ArchiveManager.duplicateLetter('${item.letterId}')" title="Duplicate with New ID">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </button>
            <button class="btn-card-action btn-delete" onclick="window.ArchiveManager.deleteLetter('${item.letterId}')" title="Delete">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  exportArchiveJSON() {
    const letters = this.getAllLetters();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(letters, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `IIC_Letters_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
    dlAnchor.remove();
    window.showToast('All documents backed up as JSON', 'success');
  },

  importArchiveJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          this.saveAllLetters(imported);
          this.renderArchiveList();
          window.showToast(`Imported ${imported.length} letters successfully!`, 'success');
          if (imported.length > 0) {
            window.loadLetterIntoEditor(imported[0]);
          }
        } else {
          alert('Invalid file format. Expected a JSON array of letters.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  }
};
