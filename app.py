"""FirstHello local-first demo server. Python standard library only.

Run: py app.py   (Windows) / python3 app.py (macOS/Linux)
Only listens on 127.0.0.1; never connects to third-party networks.
"""
from __future__ import annotations

import json
from datetime import date
from firsthello.friendship_memory import (
    check_birthdays,
    load_birthdays,
    edit_birthday,
    delete_birthday,
)
import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from firsthello.agent import demo_history, profile_summary, quiz_questions, score_friendly_quiz, ranked_matches
from firsthello.agent_ai import local_agent
from firsthello.local_llm import Ollama

ROOT = Path(__file__).parent.resolve()
STATIC = ROOT / "static"
HOST = "127.0.0.1"
PORT = int(os.getenv("FIRSTHELLO_PORT", "8772"))
MAX_JSON = 50_000


class Handler(BaseHTTPRequestHandler):
    def send_payload(self, code: int, payload: dict | list) -> None:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(raw)

    
    def do_GET(self) -> None:
        path = urlsplit(self.path).path
        
        if path == "/api/birthdays":
            return self.send_payload(
                200, {"birthdays": load_birthdays()}
            )


        if path == "/api/birthday-reminders":
            today = date(2026, 11, 8) if urlsplit(self.path).query == "demo=1" else date.today()
            return self.send_payload(
                200, {"reminders": check_birthdays(today)}
            )

        if path == "/api/health":
            return self.send_payload(
                200,
                {"ok": True, "mode": "local_demo", "paid_services": False}
            )


        if path == "/api/ai/status":
            return self.send_payload(200, Ollama().status())
        if path == "/api/profiles":
            return self.send_payload(200, profile_summary())
        if path.startswith("/api/history/"):
            try:
                return self.send_payload(200, demo_history(path.rsplit("/", 1)[-1]))
            except ValueError:
                return self.send_payload(404, {"error": "No demo profile"})
        if path.startswith("/api/quiz/"):
            try:
                return self.send_payload(200, {"questions": quiz_questions(path.rsplit("/", 1)[-1])})
            except ValueError:
                return self.send_payload(404, {"error": "No demo profile"})
        if path == "/":
            path = "/index.html"
        target = (STATIC / path.lstrip("/")).resolve()
        if not target.is_relative_to(STATIC) or not target.is_file():
            return self.send_payload(404, {"error": "Not found"})
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(str(target))[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    
    def do_POST(self) -> None:
        if self.path not in (
            "/api/coach",
            "/api/matches",
            "/api/quiz/score",
            "/api/birthdays/edit",
            "/api/birthdays/delete",
            "/api/memory",
        ):
            return self.send_payload(404, {"error": "Unknown endpoint"})

        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_JSON:
                return self.send_payload(
                    413, {"error": "Request too large or empty"}
                )

            body = json.loads(self.rfile.read(length))

            if not isinstance(body, dict):
                raise ValueError("Expected an object")


            if self.path == "/api/birthdays/edit":
                friend = body.get("friend")
                month = body.get("month")
                day = body.get("day")

                if not isinstance(friend, str) or not friend or len(friend) > 60:
                    raise ValueError("Invalid friend")
                if type(month) is not int or type(day) is not int:
                    raise ValueError("Invalid birthday")
                if body.get("consent") is not True:
                    return self.send_payload(403, {"error": "Approval required"})

                message = edit_birthday(friend, month, day, consent=True)
                return self.send_payload(200, {
                    "message": message,
                    "birthdays": load_birthdays()
                })

            if self.path == "/api/birthdays/delete":
                friend = body.get("friend")

                if not isinstance(friend, str) or not friend or len(friend) > 60:
                    raise ValueError("Invalid friend")
                if body.get("confirmed") is not True:
                    return self.send_payload(403, {"error": "Confirmation required"})

                message = delete_birthday(friend, confirmed=True)
                return self.send_payload(200, {
                    "message": message,
                    "birthdays": load_birthdays()
                })


            if self.path == "/api/coach":
                out = local_agent(body.get("profile_id", ""), body.get("interests", []), body.get("recent", []))
                
            elif self.path == "/api/memory":
                friend = next(
                    (p for p in profile_summary()
                     if p["id"] == body.get("profile_id")),
                    None
                )

                if friend is None:
                    raise ValueError("Unknown fictional friend")

                action = body.get("action")

                if action == "suggest":
                    message = body.get("message")

                    if not isinstance(message, str) or len(message) > 800:
                        raise ValueError("Invalid fictional message")

                    from firsthello.memory_suggestions import detect_birthday
                    out = {"suggestion": detect_birthday(message)}

                elif action == "remember":
                    if body.get("consent") is not True:
                        raise ValueError("Approval required")

                    from firsthello.friendship_memory import save_birthday
                    out = {
                        "message": save_birthday(
                            friend["name"],
                            body.get("month"),
                            body.get("day"),
                            consent=True
                        )
                    }

                else:
                    raise ValueError("Unknown memory action")

            elif self.path == "/api/matches":
                interests = body.get("interests", [])
                genders = body.get("genders", None)
                if not isinstance(interests, list) or len(interests) > 30 or any(not isinstance(x, str) or len(x) > 100 for x in interests):
                    raise ValueError("Invalid interests")
                if genders is not None and (not isinstance(genders, list) or any(not isinstance(x, str) for x in genders)):
                    raise ValueError("Invalid preferences")
                out = ranked_matches(interests, genders)
            else:
                out = score_friendly_quiz(body.get("profile_id", ""), body.get("answers", []))
            return self.send_payload(200, out)
        except (ValueError, TypeError, KeyError, json.JSONDecodeError) as e:
            return self.send_payload(400, {"error": str(e)[:200]})
        except Exception:
            return self.send_payload(500, {"error": "Unexpected error; see server logs"})

    def log_message(self, fmt: str, *args) -> None:
        # Do not put student/private chat text into server logs.
        print("[FirstHello] " + fmt % args)


if __name__ == "__main__":
    print(f"FirstHello is ready at http://{HOST}:{PORT}")
    print("Free local AI with Ollama (if installed); otherwise offline suggestions • Fictional people only")
    print("Keep this window open while you use the website. Ctrl+C stops it.")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
