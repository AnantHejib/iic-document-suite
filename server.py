import http.server
import socketserver
import webbrowser
import os
import sys
import json
import socket
import threading
import time
import subprocess
import re
from urllib.parse import urlparse, unquote

PORT = int(os.environ.get('PORT', 3000))
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
LETTERS_FILE = os.path.join(DATA_DIR, 'letters.json')

db_lock = threading.Lock()
current_db_version = int(time.time() * 1000)

global_tunnel_url = None
tunnel_process = None

def get_local_ip():
    """Detect the most likely LAN/Wi-Fi IPv4 address for multi-device access"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"

def init_database():
    """Ensure data/letters.json exists with initial sample letter"""
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(LETTERS_FILE):
        initial_data = [
            {
                "id": "doc_sample_001",
                "letterId": "LSIT/IIC/2627/001",
                "date": "2026-10-01",
                "dateFormatted": "01/10/2026",
                "recipient": {
                    "name": "Dr. P. S. Patil",
                    "designation": "Head of Department, First-Year Engineering",
                    "institution": "Sinhgad Institute of Technology, Lonavala"
                },
                "salutation": "Respected Sir,",
                "subject": "Permission to Conduct Classroom Publicity for “Drone Workshop 2026”",
                "content": "<p>We hope you are doing well.</p><p>Team IIC is organizing <strong>“Drone Workshop 2026”</strong> exclusively for First-Year Engineering students on <strong>3 October 2026</strong>. The workshop aims to develop enthusiasm and passion for practical engineering among students by providing them with an opportunity to explore <strong>drone technology, computer engineering, and various other engineering domains</strong> through hands-on learning.</p><p>This workshop also marks the beginning of a <strong>new era for the fourth generation of Team IIC</strong>. Through this initiative, we aim to foster innovation, creativity, technical curiosity, and active participation among First-Year Engineering students.</p><p>To create awareness about the workshop and encourage student participation, we would like to conduct a brief <strong>classroom publicity campaign</strong> in the First-Year Engineering classrooms. We assure you that the classroom visits will be conducted for a short duration and will be planned in a manner that causes minimal disruption to regular academic activities.</p><p>We kindly request your <strong>permission and support to visit the FE classrooms</strong> and promote the workshop at a suitable time as per the department's convenience.</p><p>We would be grateful for your consideration and support.</p><p><strong>Thank you.</strong></p>",
                "signoff": "Yours sincerely,",
                "entity": "Team IIC",
                "organization": "Sinhgad Institute of Technology, Lonavala",
                "signatories": [
                    {
                        "name": "Dr. M. S. Chaudhari",
                        "designation": "R&D DEAN & IIC PRESIDENT",
                        "hasEsign": False,
                        "esignData": None
                    },
                    {
                        "name": "Dr. P. S. Patil",
                        "designation": "Head of Department FE",
                        "hasEsign": False,
                        "esignData": None
                    }
                ],
                "createdAt": "2026-10-01T00:00:00.000Z",
                "updatedAt": "2026-10-01T00:00:00.000Z"
            }
        ]
        with open(LETTERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(initial_data, f, indent=2, ensure_ascii=False)

def read_letters_db():
    init_database()
    with db_lock:
        try:
            with open(LETTERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

def write_letters_db(letters):
    global current_db_version
    init_database()
    with db_lock:
        with open(LETTERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(letters, f, indent=2, ensure_ascii=False)
        current_db_version = int(time.time() * 1000)

def start_localtunnel():
    """Start background global tunnel for worldwide access over any network"""
    global global_tunnel_url, tunnel_process
    print("\n  >> Launching Global Internet Tunnel for Worldwide Access...")
    try:
        tunnel_process = subprocess.Popen('npx --yes localtunnel --port 3000', shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        start_time = time.time()
        while time.time() - start_time < 15:
            line = tunnel_process.stdout.readline()
            if 'your url is:' in line:
                match = re.search(r'https://[^\s]+', line)
                if match:
                    global_tunnel_url = match.group(0).strip()
                    print("\n" + "=" * 64)
                    print("  >> GLOBAL PUBLIC HTTPS URL (ANY NETWORK / WORLDWIDE):")
                    print(f"  >> {global_tunnel_url}")
                    print("=" * 64)
                    print("  Share this link with anyone anywhere on earth!")
                    print("  Works over 4G/5G mobile data, home Wi-Fi, and any network.")
                    print("=" * 64 + "\n")
                    break
            time.sleep(0.2)
    except Exception as e:
        print(f"  >> Notice: Localtunnel not started ({e}). Local and LAN access remain active.")

class MultiDeviceHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable aggressive caching for live sync
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # 1. API: Network info for other devices
        if path == '/api/network-info':
            local_ip = get_local_ip()
            info = {
                "success": True,
                "hostname": socket.gethostname(),
                "localIp": local_ip,
                "port": PORT,
                "networkUrl": f"http://{local_ip}:{PORT}/index.html",
                "localUrl": f"http://localhost:{PORT}/index.html",
                "globalUrl": global_tunnel_url or None,
                "isGlobal": bool(global_tunnel_url)
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(info).encode('utf-8'))
            return

        # 2. API: Fast database version check for live sync polling
        if path == '/api/version':
            letters = read_letters_db()
            data = {
                "success": True,
                "version": current_db_version,
                "count": len(letters),
                "timestamp": int(time.time() * 1000)
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return

        # 3. API: Get all letters
        if path == '/api/letters':
            letters = read_letters_db()
            data = {
                "success": True,
                "version": current_db_version,
                "letters": letters
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return

        # Fallback to static file serving
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # 1. API: Save or update letter from any device
        if path == '/api/letters':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(body)
                letter = payload.get('letter') or payload
                force_as_new = payload.get('forceAsNew', False)

                letters = read_letters_db()
                target_id = (letter.get('letterId') or '').strip().lower()

                now = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())

                if force_as_new:
                    # Find maximum serial number
                    max_num = 1
                    for l in letters:
                        lid = l.get('letterId', '')
                        digits = [c for c in lid if c.isdigit()]
                        if digits:
                            try:
                                max_num = max(max_num, int(''.join(digits[-3:])))
                            except Exception:
                                pass
                    new_id = f"LSIT/IIC/2627/{str(max_num + 1).zfill(3)}"
                    letter['letterId'] = new_id
                    letter['id'] = f"doc_{int(time.time()*1000)}"
                    letter['createdAt'] = now
                    letter['updatedAt'] = now
                    letters.insert(0, letter)
                else:
                    existing_idx = -1
                    for idx, l in enumerate(letters):
                        if (l.get('letterId') or '').strip().lower() == target_id:
                            existing_idx = idx
                            break

                    if existing_idx >= 0:
                        letter['createdAt'] = letters[existing_idx].get('createdAt', now)
                        letter['id'] = letters[existing_idx].get('id', f"doc_{int(time.time()*1000)}")
                        letter['updatedAt'] = now
                        letters[existing_idx] = letter
                    else:
                        letter['id'] = f"doc_{int(time.time()*1000)}"
                        letter['createdAt'] = now
                        letter['updatedAt'] = now
                        letters.insert(0, letter)

                write_letters_db(letters)

                response_data = {
                    "success": True,
                    "version": current_db_version,
                    "letter": letter,
                    "message": f"Saved letter {letter.get('letterId')}"
                }
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith('/api/letters/'):
            letter_id = unquote(path[len('/api/letters/'):]).strip()
            letters = read_letters_db()
            filtered = [l for l in letters if (l.get('letterId') or '').strip().lower() != letter_id.lower()]
            write_letters_db(filtered)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "version": current_db_version, "deleted": letter_id}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

def start_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    init_database()
    local_ip = get_local_ip()

    is_global_mode = '--global' in sys.argv or '-g' in sys.argv or '--tunnel' in sys.argv
    if is_global_mode:
        t = threading.Thread(target=start_localtunnel, daemon=True)
        t.start()

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", PORT), MultiDeviceHandler) as httpd:
        local_url = f"http://localhost:{PORT}/index.html"
        network_url = f"http://{local_ip}:{PORT}/index.html"

        print("=" * 64)
        print("  IIC DocCraft Pro - Sinhgad Institute of Technology")
        print("  Multi-Device Document Server & Live Sync Active!")
        print("=" * 64)
        print(f"  >> This Computer (Local):  {local_url}")
        print(f"  >> Same Wi-Fi (LAN):       {network_url}")
        if is_global_mode:
            print("  >> Global Tunnel:          Initializing global HTTPS link...")
        else:
            print("  >> Run with '--global' or Launch_Global_Internet_Access.bat")
            print("     to enable access over ANY network worldwide!")
        print("=" * 64)
        print("  Press Ctrl+C to stop server.")
        print("=" * 64)

        # Open in default browser when running locally on desktop
        if not os.environ.get('RENDER') and not os.environ.get('PORT') and not os.environ.get('CI'):
            try:
                webbrowser.open(local_url)
            except Exception:
                pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server gracefully...")
            if tunnel_process:
                try:
                    subprocess.run(f"taskkill /F /T /PID {tunnel_process.pid}", shell=True, capture_output=True)
                except Exception:
                    pass

if __name__ == '__main__':
    start_server()
