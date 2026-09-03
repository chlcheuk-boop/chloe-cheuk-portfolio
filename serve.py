"""Dev server for the portfolio: identical to python -m http.server but
sends no-store so the browser always picks up the latest edit."""
import functools, http.server, os

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, *a):
        pass

if __name__ == '__main__':
    http.server.test(
        HandlerClass=functools.partial(NoCache, directory='.'),
        ServerClass=http.server.ThreadingHTTPServer,
        # PORT lets a launcher hand us a free port; 4173 by default
        port=int(os.environ.get('PORT', 4173)), bind='127.0.0.1',
    )
