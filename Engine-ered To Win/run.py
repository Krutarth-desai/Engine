import subprocess
import sys
import os
import time
import socket
import webbrowser

def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def wait_for_port(port: int, timeout_sec: int = 20, host: str = "127.0.0.1") -> bool:
    start_time = time.time()
    while time.time() - start_time < timeout_sec:
        if is_port_in_use(port, host):
            return True
        time.sleep(0.5)
    return False

def main():
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    root_dir = os.path.dirname(os.path.abspath(__file__))
    python_exe = os.path.join(root_dir, "venv", "Scripts", "python.exe")
    if not os.path.exists(python_exe):
        python_exe = sys.executable

    print("==================================================")
    print("[AEROTWIN] Launching AeroTwin GCS (Backend + Frontend)")
    print("==================================================")
    
    # Check for port collisions
    if is_port_in_use(8000):
        print("[WARNING] Port 8000 is already in use! Another instance may already be running.")
    if is_port_in_use(3000):
        print("[WARNING] Port 3000 is already in use! Another instance may already be running.")

    # 1. Start Backend
    print("[1/2] Starting Python FastAPI Telemetry & ML Backend on port 8000...")
    backend_proc = subprocess.Popen(
        [python_exe, "live_telemetry_server.py"],
        cwd=root_dir
    )
    
    # 2. Start Frontend
    print("[2/2] Starting Next.js React GCS Frontend on port 3000...")
    frontend_dir = os.path.join(root_dir, "frontend")
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=frontend_dir,
        shell=True
    )
    
    print("\nWaiting for services to become ready...")
    backend_ready = wait_for_port(8000, timeout_sec=25)
    frontend_ready = wait_for_port(3000, timeout_sec=25)
    
    print("\n" + "=" * 50)
    if backend_ready and frontend_ready:
        print("[OK] All services online and ready!")
    else:
        if not backend_ready:
            print("[WARN] Backend on port 8000 took longer than expected to initialize.")
        if not frontend_ready:
            print("[WARN] Frontend on port 3000 took longer than expected to initialize.")
            
    print("-> Frontend Dashboard: http://localhost:3000")
    print("-> Backend Telemetry:  http://localhost:8000")
    print("=" * 50)
    print("\nPress Ctrl+C to terminate all services.\n")
    
    # Automatically open browser
    try:
        webbrowser.open("http://localhost:3000")
    except Exception:
        pass

    try:
        while True:
            time.sleep(1)
            b_code = backend_proc.poll()
            f_code = frontend_proc.poll()
            if b_code is not None:
                print(f"\n[ALERT] Backend process exited unexpectedly with exit code {b_code}.")
                break
            if f_code is not None:
                print(f"\n[ALERT] Frontend process exited unexpectedly with exit code {f_code}.")
                break
    except KeyboardInterrupt:
        print("\n\n[SHUTDOWN] Shutting down AeroTwin services...")
    finally:
        try:
            backend_proc.terminate()
            backend_proc.wait(timeout=2)
        except Exception:
            try:
                backend_proc.kill()
            except Exception:
                pass
            
        try:
            # On Windows, killing npm task tree
            subprocess.run(f"taskkill /F /T /PID {frontend_proc.pid}", shell=True, capture_output=True)
        except Exception:
            pass
        print("[OK] Shutdown complete.")

if __name__ == "__main__":
    main()

