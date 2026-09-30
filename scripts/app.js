/**
 * IIC DocCraft Pro - Main Application Controller
 * Real-time reactive data binding, preview rendering, and workflow orchestration
 */

window.AppState = {
  currentLetter: null,
  zoomLevel: 1.0,
  signatoryCount: 2
};

document.addEventListener('DOMContentLoaded', () => {
  // Initialize embedded Base64 logos into preview
  initLetterheadLogos();

  // Initialize E-Sign manager
  if (window.EsignManager) window.EsignManager.init();

  // Load archive and setup initial letter
  initArchiveAndFirstLetter();

  // Initialize Multi-Device Live Sync manager
  if (window.SyncManager) window.SyncManager.init();

  // Bind all UI event listeners
  bindFormEventListeners();
  bindToolbarActions();
  bindModalActions();
  bindZoomControls();
  populateDropdownOptions();
});

/**
 * Initialize logos into the official letterhead
 */
function initLetterheadLogos() {
  const leftLogoImg = document.getElementById('letterhead-left-logo-img');
  const rightLogoImg = document.getElementById('letterhead-right-logo-img');

  if (leftLogoImg) {
    leftLogoImg.src = window.SINHGAD_LOGO_B64 || 'assets/sinhgad_logo.png';
  }
  if (rightLogoImg) {
    rightLogoImg.src = window.IIC_LOGO_B64 || 'assets/iic_logo.png';
  }
}

/**
 * Initialize archive and load first letter
 */
function initArchiveAndFirstLetter() {
  const allLetters = window.ArchiveManager.getAllLetters();
  if (allLetters.length > 0) {
    loadLetterIntoEditor(allLetters[0]);
  } else {
    const sample = window.ArchiveManager.getSampleLetter();
    window.ArchiveManager.saveLetter(sample);
    loadLetterIntoEditor(sample);
  }
  window.ArchiveManager.renderArchiveList();
}

/**
 * Populate template, salutation, sign-off, and entity dropdowns
 */
function populateDropdownOptions() {
  const presets = window.IIC_PRESETS;
  if (!presets) return;

  // 1. Templates Dropdown
  const templateSelect = document.getElementById('template-select');
  if (templateSelect && window.IIC_TEMPLATES) {
    templateSelect.innerHTML = '<option value="">-- Choose a Ready-to-Use IIC Template --</option>';
    window.IIC_TEMPLATES.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `[${t.category}] ${t.name}`;
      templateSelect.appendChild(opt);
    });
  }

  // 2. Salutation Presets
  const salutationSelect = document.getElementById('salutation-select');
  if (salutationSelect && presets.salutations) {
    salutationSelect.innerHTML = '';
    presets.salutations.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      salutationSelect.appendChild(opt);
    });
  }

  // 3. Sign-off Presets
  const signoffSelect = document.getElementById('signoff-select');
  if (signoffSelect && presets.signoffs) {
    signoffSelect.innerHTML = '';
    presets.signoffs.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      signoffSelect.appendChild(opt);
    });
  }

  // 4. Entity Presets
  const entitySelect = document.getElementById('entity-select');
  if (entitySelect && presets.entities) {
    entitySelect.innerHTML = '';
    presets.entities.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e;
      opt.textContent = e;
      entitySelect.appendChild(opt);
    });
  }
}

/**
 * Load a letter object into the editor UI
 */
window.loadLetterIntoEditor = function(letter) {
  window.AppState.currentLetter = JSON.parse(JSON.stringify(letter));
  const cur = window.AppState.currentLetter;

  // 1. Meta
  document.getElementById('input-letter-id').value = cur.letterId || '';
  document.getElementById('input-letter-date').value = cur.date || '';

  // 2. Recipient (Direct free text for ANY person)
  document.getElementById('input-recipient-name').value = cur.recipient?.name || '';
  document.getElementById('input-recipient-desig').value = cur.recipient?.designation || '';
  document.getElementById('input-recipient-institution').value = cur.recipient?.institution || 'Sinhgad Institute of Technology, Lonavala';

  // 3. Salutation & Subject
  document.getElementById('salutation-select').value = cur.salutation || 'Respected Sir,';
  document.getElementById('input-letter-subject').value = cur.subject || '';

  // 4. Body Content
  const editorBox = document.getElementById('rich-content-editor');
  editorBox.innerHTML = cur.content || '<p>We hope you are doing well.</p>';

  // 5. Sign-off
  document.getElementById('signoff-select').value = cur.signoff || 'Yours sincerely,';
  document.getElementById('entity-select').value = cur.entity || 'Team IIC';
  document.getElementById('input-organization').value = cur.organization || 'Sinhgad Institute of Technology, Lonavala';

  // 6. Signatories
  window.AppState.signatoryCount = cur.signatories?.length || 2;
  const countSelect = document.getElementById('signatory-count-select');
  if (countSelect) countSelect.value = window.AppState.signatoryCount;

  renderSignatoryFormInputs();
  renderDocumentPreview();
  updateTopNavIdBadge();
  window.ArchiveManager.renderArchiveList();
};

window.loadLetterById = function(letterId) {
  const letters = window.ArchiveManager.getAllLetters();
  const letter = letters.find(l => l.letterId === letterId);
  if (letter) {
    window.loadLetterIntoEditor(letter);
    showToast(`Loaded ${letterId}`, 'success');
  }
};

/**
 * Update the navbar letter ID badge
 */
function updateTopNavIdBadge() {
  const badgeEl = document.getElementById('nav-current-letter-id');
  if (badgeEl && window.AppState.currentLetter) {
    badgeEl.textContent = window.AppState.currentLetter.letterId || 'Draft';
  }
}

/**
 * Dynamic Signatory Form Inputs in Left Panel
 * Lets the user type ANY name and title freely
 */
function renderSignatoryFormInputs() {
  const container = document.getElementById('signatories-form-container');
  if (!container) return;

  const signatories = window.AppState.currentLetter.signatories || [];

  container.innerHTML = signatories.map((sig, idx) => {
    const hasSign = sig.hasEsign && sig.esignData;
    const labelTitle = idx === 0 ? 'Signatory 1 (Left Authority)' : (idx === 1 ? 'Signatory 2 (Right Authority)' : 'Signatory 3 (Coordinator)');

    return `
      <div class="signatory-item-box" data-index="${idx}">
        <div class="signatory-header">
          <span>${labelTitle}</span>
          <span class="esign-status-pill">
            ${hasSign ? '<span class="badge-has-sign">✓ E-Sign Added</span>' : '<span class="badge-no-sign">No E-Sign</span>'}
          </span>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Signatory Name (Anyone's Name):</label>
            <input type="text" class="input-control sig-name-input" data-index="${idx}" value="${sig.name || ''}" placeholder="e.g. Dr. M. S. Chaudhari / Dr. P. S. Patil">
          </div>
          <div class="form-group">
            <label>Designation / Post:</label>
            <input type="text" class="input-control sig-desig-input" data-index="${idx}" value="${sig.designation || ''}" placeholder="e.g. R&D DEAN & IIC PRESIDENT / HOD FE">
          </div>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 4px;">
          <button class="btn btn-secondary btn-sm" onclick="window.EsignManager.openModal(${idx})">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="11" cy="11" r="2"/></svg>
            ${hasSign ? 'Modify E-Sign' : 'Draw / Add E-Sign'}
          </button>
          ${hasSign ? `
            <button class="btn btn-danger btn-sm" onclick="window.EsignManager.removeSignature(${idx})">
              Remove Sign
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Bind signatory input events
  container.querySelectorAll('.sig-name-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      window.AppState.currentLetter.signatories[idx].name = e.target.value;
      window.renderDocumentPreview();
    });
  });

  container.querySelectorAll('.sig-desig-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      window.AppState.currentLetter.signatories[idx].designation = e.target.value;
      window.renderDocumentPreview();
    });
  });
}

window.updateSignatoryUI = function() {
  renderSignatoryFormInputs();
};

/**
 * Render Live Authentic A4 Document Preview
 */
window.renderDocumentPreview = function() {
  const cur = window.AppState.currentLetter;
  if (!cur) return;

  // 1. Date
  const dateEl = document.getElementById('preview-date-line');
  if (dateEl) {
    dateEl.textContent = `Date :     ${cur.dateFormatted || cur.date || '/10/2026'}`;
  }

  // 2. Recipient Block
  const recEl = document.getElementById('preview-recipient-block');
  if (recEl) {
    const recName = cur.recipient?.name || 'Recipient Name';
    const recDesig = cur.recipient?.designation || 'Designation / Department';
    const recInst = cur.recipient?.institution || 'Sinhgad Institute of Technology, Lonavala';
    recEl.innerHTML = `
      <div class="to-label">To,</div>
      <div>${recName}</div>
      <div>${recDesig}</div>
      <div>${recInst}</div>
    `;
  }

  // 3. Subject Line
  const subEl = document.getElementById('preview-subject-line');
  if (subEl) {
    let sub = cur.subject || '';
    if (!sub.toLowerCase().startsWith('subject:')) {
      sub = 'Subject: ' + sub;
    }
    subEl.textContent = sub;
  }

  // 4. Salutation Line
  const salEl = document.getElementById('preview-salutation-line');
  if (salEl) {
    salEl.textContent = cur.salutation || 'Respected Sir,';
  }

  // 5. Body Content Paragraphs
  const contentEl = document.getElementById('preview-content-paragraphs');
  if (contentEl) {
    contentEl.innerHTML = cur.content || '<p>We hope you are doing well.</p>';
  }

  // 6. Sign-off Block
  const signoffEl = document.getElementById('preview-signoff-block');
  if (signoffEl) {
    signoffEl.innerHTML = `
      <div>${cur.signoff || 'Yours sincerely,'}</div>
      <div class="entity-name">${cur.entity || 'Team IIC'}</div>
      <div>${cur.organization || 'Sinhgad Institute of Technology, Lonavala'}</div>
    `;
  }

  // 7. Signatories Table
  const sigTableEl = document.getElementById('preview-signatories-table');
  if (sigTableEl) {
    const signers = cur.signatories || [];
    sigTableEl.innerHTML = signers.map((s, idx) => {
      const isRight = idx === 1;
      return `
        <div class="doc-signatory-cell ${isRight ? 'right-align' : ''}">
          <div class="esign-display-box">
            ${s.hasEsign && s.esignData ? `<img src="${s.esignData}" alt="E-Sign">` : ''}
          </div>
          <div class="signatory-doc-name">${s.name || ''}</div>
          <div class="signatory-doc-desig">${s.designation || ''}</div>
        </div>
      `;
    }).join('');
  }

  // 8. Footer Letter ID
  const footerIdEl = document.getElementById('preview-letter-id-text');
  if (footerIdEl) {
    footerIdEl.textContent = `Letter ID: ${cur.letterId || 'LSIT/IIC/2627/001'}`;
  }
};

/**
 * Bind form controls for real-time reactivity
 */
function bindFormEventListeners() {
  // Letter ID
  const letterIdInput = document.getElementById('input-letter-id');
  letterIdInput.addEventListener('input', (e) => {
    window.AppState.currentLetter.letterId = e.target.value.trim();
    // Whenever user types a new ID, decouple internal doc id
    window.AppState.currentLetter.id = 'doc_' + Date.now();
    window.renderDocumentPreview();
    updateTopNavIdBadge();
  });

  // Auto-next Letter ID button
  const btnNextId = document.getElementById('btn-next-letter-id');
  if (btnNextId) {
    btnNextId.addEventListener('click', () => {
      const nextId = window.ArchiveManager.incrementLetterSerial();
      window.AppState.currentLetter.letterId = nextId;
      window.AppState.currentLetter.id = 'doc_' + Date.now();
      letterIdInput.value = nextId;
      window.renderDocumentPreview();
      updateTopNavIdBadge();
      showToast(`Generated next ID: ${nextId}`, 'success');
    });
  }

  // Letter Date
  const dateInput = document.getElementById('input-letter-date');
  dateInput.addEventListener('change', (e) => {
    const val = e.target.value;
    window.AppState.currentLetter.date = val;
    if (val) {
      const [y, m, d] = val.split('-');
      window.AppState.currentLetter.dateFormatted = `${d}/${m}/${y}`;
    } else {
      window.AppState.currentLetter.dateFormatted = '';
    }
    window.renderDocumentPreview();
  });

  // Template selector
  const templateSelect = document.getElementById('template-select');
  templateSelect.addEventListener('change', (e) => {
    const tId = e.target.value;
    if (!tId) return;
    const template = window.IIC_TEMPLATES.find(t => t.id === tId);
    if (!template) return;

    if (confirm(`Load template "${template.name}"? This will populate the subject, body content, and signatories.`)) {
      window.AppState.currentLetter.subject = template.subject;
      window.AppState.currentLetter.salutation = template.salutation;
      window.AppState.currentLetter.content = template.content;
      window.AppState.currentLetter.signoff = template.signoff;
      window.AppState.currentLetter.entity = template.entity;
      window.AppState.currentLetter.organization = template.organization;
      if (template.recipient) {
        window.AppState.currentLetter.recipient = { ...template.recipient };
      }
      if (template.signatories) {
        window.AppState.currentLetter.signatories = template.signatories.map(s => ({ ...s }));
      }
      window.loadLetterIntoEditor(window.AppState.currentLetter);
      showToast(`Loaded "${template.name}"`, 'success');
    }
  });

  // Recipient inputs (ANY name, designation, institution)
  document.getElementById('input-recipient-name').addEventListener('input', (e) => {
    if (!window.AppState.currentLetter.recipient) window.AppState.currentLetter.recipient = {};
    window.AppState.currentLetter.recipient.name = e.target.value;
    window.renderDocumentPreview();
  });

  document.getElementById('input-recipient-desig').addEventListener('input', (e) => {
    if (!window.AppState.currentLetter.recipient) window.AppState.currentLetter.recipient = {};
    window.AppState.currentLetter.recipient.designation = e.target.value;
    window.renderDocumentPreview();
  });

  document.getElementById('input-recipient-institution').addEventListener('input', (e) => {
    if (!window.AppState.currentLetter.recipient) window.AppState.currentLetter.recipient = {};
    window.AppState.currentLetter.recipient.institution = e.target.value;
    window.renderDocumentPreview();
  });

  // Salutation dropdown
  document.getElementById('salutation-select').addEventListener('change', (e) => {
    window.AppState.currentLetter.salutation = e.target.value;
    window.renderDocumentPreview();
  });

  // Subject input
  document.getElementById('input-letter-subject').addEventListener('input', (e) => {
    window.AppState.currentLetter.subject = e.target.value;
    window.renderDocumentPreview();
  });

  // Rich Text Editor
  const richEditor = document.getElementById('rich-content-editor');
  richEditor.addEventListener('input', () => {
    window.AppState.currentLetter.content = richEditor.innerHTML;
    window.renderDocumentPreview();
  });

  // Sign-off dropdown
  document.getElementById('signoff-select').addEventListener('change', (e) => {
    window.AppState.currentLetter.signoff = e.target.value;
    window.renderDocumentPreview();
  });

  // Entity dropdown
  document.getElementById('entity-select').addEventListener('change', (e) => {
    window.AppState.currentLetter.entity = e.target.value;
    window.renderDocumentPreview();
  });

  // Organization tagline
  document.getElementById('input-organization').addEventListener('input', (e) => {
    window.AppState.currentLetter.organization = e.target.value;
    window.renderDocumentPreview();
  });

  // Signatory Count toggle
  const sigCountSelect = document.getElementById('signatory-count-select');
  if (sigCountSelect) {
    sigCountSelect.addEventListener('change', (e) => {
      const count = parseInt(e.target.value, 10);
      window.AppState.signatoryCount = count;
      let signatories = window.AppState.currentLetter.signatories || [];
      if (signatories.length < count) {
        while (signatories.length < count) {
          signatories.push({ name: '', designation: '', hasEsign: false, esignData: null });
        }
      } else if (signatories.length > count) {
        signatories = signatories.slice(0, count);
      }
      window.AppState.currentLetter.signatories = signatories;
      renderSignatoryFormInputs();
      window.renderDocumentPreview();
    });
  }

  // Archive search
  const archiveSearch = document.getElementById('archive-search-input');
  if (archiveSearch) {
    archiveSearch.addEventListener('input', (e) => {
      window.ArchiveManager.renderArchiveList(e.target.value);
    });
  }
}

/**
 * Bind toolbar actions (Save, Save as New, Print, Docx, New Letter, Toggle Archive)
 */
function bindToolbarActions() {
  // New Letter Draft
  document.getElementById('btn-new-letter').addEventListener('click', () => {
    window.createNewLetterDraft();
  });

  // Save Letter (With overwrite conflict protection & immediate download modal)
  document.getElementById('btn-save-letter').addEventListener('click', () => {
    const curId = (window.AppState.currentLetter.letterId || '').trim();
    const isExisting = window.ArchiveManager.isLetterIdExisting(curId);

    // If letter ID already exists in archive, check if we need to confirm
    if (isExisting) {
      const allLetters = window.ArchiveManager.getAllLetters();
      const existingLetter = allLetters.find(l => (l.letterId || '').trim().toLowerCase() === curId.toLowerCase());
      
      // If the subject or recipient is different, it might be an accidental overwrite!
      if (existingLetter && (existingLetter.recipient?.name !== window.AppState.currentLetter.recipient?.name || existingLetter.subject !== window.AppState.currentLetter.subject)) {
        window.openSaveConflictModal(curId);
        return;
      }
    }

    // Direct save
    const saved = window.ArchiveManager.saveLetter(window.AppState.currentLetter, false);
    showToast(`Saved letter [${saved.letterId}]`, 'success');
    window.openSaveDownloadModal(saved);
  });

  // Save as New Letter (Always assigns next available ID, never overwrites!)
  document.getElementById('btn-save-as-new').addEventListener('click', () => {
    const saved = window.ArchiveManager.saveLetter(window.AppState.currentLetter, true);
    showToast(`Saved as new document: [${saved.letterId}]!`, 'success');
    window.openSaveDownloadModal(saved);
  });

  // Print / Save to PDF
  document.getElementById('btn-print-pdf').addEventListener('click', () => {
    window.print();
  });

  // Download Word .docx
  document.getElementById('btn-download-docx').addEventListener('click', () => {
    window.DocxExporter.generateDocx(window.AppState.currentLetter);
  });

  // Toggle Archive panel
  const toggleArchiveBtn = document.getElementById('btn-toggle-archive');
  if (toggleArchiveBtn) {
    toggleArchiveBtn.addEventListener('click', () => {
      const panel = document.getElementById('archive-panel');
      panel.classList.toggle('collapsed');
    });
  }

  // Backup & Restore
  const btnExportBackup = document.getElementById('btn-export-backup');
  if (btnExportBackup) {
    btnExportBackup.addEventListener('click', () => {
      window.ArchiveManager.exportArchiveJSON();
    });
  }

  const fileInputImport = document.getElementById('file-import-backup');
  if (fileInputImport) {
    fileInputImport.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        window.ArchiveManager.importArchiveJSON(e.target.files[0]);
      }
    });
  }
}

/**
 * Bind Download Modal & Conflict Modal Actions
 */
function bindModalActions() {
  // Download Modal: PDF
  const modalPdfBtn = document.getElementById('modal-btn-download-pdf');
  if (modalPdfBtn) {
    modalPdfBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Download Modal: DOCX
  const modalDocxBtn = document.getElementById('modal-btn-download-docx');
  if (modalDocxBtn) {
    modalDocxBtn.addEventListener('click', () => {
      window.DocxExporter.generateDocx(window.AppState.currentLetter);
    });
  }

  // Download Modal: Next Letter
  const modalNextLetterBtn = document.getElementById('modal-btn-next-letter');
  if (modalNextLetterBtn) {
    modalNextLetterBtn.addEventListener('click', () => {
      window.closeSaveDownloadModal();
      window.createNewLetterDraft();
    });
  }

  // Conflict Modal: Save as New
  const conflictSaveAsNewBtn = document.getElementById('conflict-btn-save-as-new');
  if (conflictSaveAsNewBtn) {
    conflictSaveAsNewBtn.addEventListener('click', () => {
      window.closeSaveConflictModal();
      const saved = window.ArchiveManager.saveLetter(window.AppState.currentLetter, true);
      showToast(`Saved as new letter: [${saved.letterId}]`, 'success');
      window.openSaveDownloadModal(saved);
    });
  }

  // Conflict Modal: Update Existing
  const conflictUpdateBtn = document.getElementById('conflict-btn-update-existing');
  if (conflictUpdateBtn) {
    conflictUpdateBtn.addEventListener('click', () => {
      window.closeSaveConflictModal();
      const saved = window.ArchiveManager.saveLetter(window.AppState.currentLetter, false);
      showToast(`Updated existing letter: [${saved.letterId}]`, 'info');
      window.openSaveDownloadModal(saved);
    });
  }
}

/**
 * Start a brand-new letter draft with the next incremented Letter ID
 */
window.createNewLetterDraft = function() {
  const nextId = window.ArchiveManager.generateNextLetterId();
  const blank = {
    id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    letterId: nextId,
    date: new Date().toISOString().slice(0, 10),
    dateFormatted: new Date().toLocaleDateString('en-GB'),
    recipient: {
      name: '',
      designation: '',
      institution: 'Sinhgad Institute of Technology, Lonavala'
    },
    salutation: 'Respected Sir,',
    subject: '',
    content: `<p>We hope you are doing well.</p><p>Type your letter content here...</p>`,
    signoff: 'Yours sincerely,',
    entity: 'Team IIC',
    organization: 'Sinhgad Institute of Technology, Lonavala',
    signatories: [
      { name: 'Dr. M. S. Chaudhari', designation: 'R&D DEAN & IIC PRESIDENT', hasEsign: false, esignData: null },
      { name: 'Dr. P. S. Patil', designation: 'Head of Department FE', hasEsign: false, esignData: null }
    ]
  };
  window.loadLetterIntoEditor(blank);
  showToast(`Ready to write new letter: ${nextId}`, 'success');
  // Focus recipient name input
  const nameInput = document.getElementById('input-recipient-name');
  if (nameInput) nameInput.focus();
};

/**
 * Open Save & Download Dialog
 */
window.openSaveDownloadModal = function(savedLetter) {
  const modal = document.getElementById('save-download-modal');
  if (!modal) return;
  const idEl = document.getElementById('modal-saved-letter-id');
  if (idEl) idEl.textContent = savedLetter.letterId || 'Saved Letter';
  const recEl = document.getElementById('modal-saved-recipient-text');
  if (recEl) recEl.textContent = `To: ${savedLetter.recipient?.name || 'Recipient'} (${savedLetter.recipient?.designation || ''})`;
  modal.classList.add('active');
};

window.closeSaveDownloadModal = function() {
  const modal = document.getElementById('save-download-modal');
  if (modal) modal.classList.remove('active');
};

/**
 * Open Overwrite Conflict Warning Modal
 */
window.openSaveConflictModal = function(letterId) {
  const modal = document.getElementById('save-conflict-modal');
  if (!modal) return;
  const idEl = document.getElementById('conflict-modal-letter-id');
  if (idEl) idEl.textContent = letterId;
  modal.classList.add('active');
};

window.closeSaveConflictModal = function() {
  const modal = document.getElementById('save-conflict-modal');
  if (modal) modal.classList.remove('active');
};

/**
 * Bind Zoom Controls for A4 sheet preview
 */
function bindZoomControls() {
  const page = document.getElementById('a4-document-sheet');
  const label = document.getElementById('zoom-percentage-text');

  function updateZoom(newZoom) {
    window.AppState.zoomLevel = Math.max(0.5, Math.min(1.5, newZoom));
    if (page) page.style.transform = `scale(${window.AppState.zoomLevel})`;
    if (label) label.textContent = `${Math.round(window.AppState.zoomLevel * 100)}%`;
  }

  document.getElementById('btn-zoom-in').addEventListener('click', () => updateZoom(window.AppState.zoomLevel + 0.1));
  document.getElementById('btn-zoom-out').addEventListener('click', () => updateZoom(window.AppState.zoomLevel - 0.1));
  document.getElementById('btn-zoom-reset').addEventListener('click', () => updateZoom(1.0));
}

/**
 * Toast Notification Utility
 */
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 250);
  }, 2800);
};

/**
 * Rich Text Editing Toolbar Handlers
 */
window.execEditorCmd = function(command, value = null) {
  document.execCommand(command, false, value);
  const richEditor = document.getElementById('rich-content-editor');
  if (richEditor) {
    window.AppState.currentLetter.content = richEditor.innerHTML;
    window.renderDocumentPreview();
  }
};
