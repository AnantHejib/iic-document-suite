# IIC DocCraft Pro - Multi-Device Document Automation Suite
### Sinhgad Institute of Technology, Lonavala &bull; Institution's Innovation Council (IIC)

Automated official letterhead documentation system with **real-time multi-device synchronization**. Create, edit, and manage IIC letters simultaneously across multiple computers, laptops, and mobile devices!

---

## 🚀 How to Launch on Your Computer

1. Double-click [**`Launch_IIC_Doc_App.bat`**](file:///c:/Users/User/Desktop/IIC%20DOCUMENT/Launch_IIC_Doc_App.bat) (or run `python server.py`).
2. The server starts the central database and automatically opens the application on your computer:
   - **Local Link**: `http://localhost:3000/index.html`

---

## 🌐 Connecting Other Devices (Laptops, Phones & Tablets)

Any other device connected to the same college Wi-Fi, hotspot, or local network can access and edit documents:

### Method A: Direct Network Address
Open your browser on any phone, iPad, or other laptop and go to:
```
http://172.17.242.36:3000/index.html
```
*(Your IP address is shown in the terminal console and in the app navbar)*

### Method B: QR Code (Mobile Phones & Tablets)
1. On your host computer, click the **"🟢 Multi-Device Sync: Active"** badge in the top navbar.
2. A modal will open showing a **Scan-able QR Code**.
3. Point your mobile phone camera at the QR code to open the software instantly!

---

## 🔄 How Real-Time Multi-Device Sync Works

- **Central Disk Database (`data/letters.json`)**: All documents are stored centrally on your computer, never lost even if someone closes their browser.
- **Bi-Directional Live Updates**:
  - When Device A (e.g. your laptop) creates or edits a letter and clicks **"Save Letter"** or **"Save as New"**, it immediately pushes the update to the central database.
  - Device B (e.g. another faculty member's computer or a mobile phone) detects the change within 2 seconds via live background heartbeat and **automatically refreshes their Letter Registry**!
- **Zero Document Overwrite**:
  - Each letter has its own distinct Letter ID (`LSIT/IIC/2627/001`, `LSIT/IIC/2627/002`, etc.).
  - The **"Save as New"** button ensures new letters never overwrite previous ones.
  - If someone tries to save with an ID that already exists, the system prompts them to either update that specific record or auto-assign the next ID.

---

## 📋 Full Feature Summary

1. **🔒 Authentic Official Letterhead**:
   - Sinhgad STES Logo + IIC Official Logo.
   - Royal Blue Society Header (`#1700AC`), NAAC Grade "A", and Council title.
   - Completely locked and standardized so no user can distort the official layout.
2. **✍️ Type ANY Recipient Name Directly**:
   - Type any dignitary's name, designation, and college/organization without being forced into a fixed dropdown list.
3. **✍️ Digital Signatures & E-Sign**:
   - Draw signatures directly on canvas, type digital cursive script, or upload transparent PNG stamps.
4. **📥 Immediate Download Dialog**:
   - Saving a letter immediately presents 1-click **Download / Print as PDF** and **Download Word Document (.docx)** buttons.
5. **🖨️ Native Word (.docx) & PDF Export**:
   - Download true `.docx` files formatted with the original letterhead without opening MS Word!
   - Instant single-page A4 PDF printing using your browser's native print engine.

---

## 📁 File Structure
```
c:\Users\User\Desktop\IIC DOCUMENT\
├── index.html                   # Main web application interface
├── Launch_IIC_Doc_App.bat       # 1-Click desktop launcher & multi-device server
├── server.py                    # Multi-device HTTP + REST API server & database engine
├── letterhead.docx              # Original reference Word template
├── data/
│   └── letters.json             # Central multi-device document database
├── assets/
│   ├── sinhgad_logo.png         # STES Sinhgad official logo
│   ├── iic_logo.png             # IIC official logo
│   ├── qrcode.min.js            # Offline QR code generator for mobile sharing
│   ├── logos_base64.js          # Base64 embedded logos
│   ├── docx_template_base64.js  # Embedded docx template for client-side generation
│   └── jszip.min.js             # Offline JSZip library
├── styles/
│   ├── main.css                 # Dashboard, letterhead & sync badge styling
│   └── print.css                # A4 print-to-PDF styles
└── scripts/
    ├── app.js                   # Application state & reactive bindings
    ├── sync.js                  # Multi-device live sync & heartbeat controller
    ├── templates.js             # IIC official letter templates & presets
    ├── archive.js               # Letter ID registry & safe storage
    ├── esign.js                 # Signature pad drawing & upload
    └── docx_export.js           # Word (.docx) file exporter
```
