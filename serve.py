"""Local dev server: like `python3 -m http.server`, but tells the browser
never to cache, so edits always show up on a normal reload.

    python3 serve.py [port]
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    print(f"Serving on http://localhost:{port}")
    ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
