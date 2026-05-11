import json
import sqlite3
from datetime import datetime
from pathlib import Path

from flask import Flask, Response, abort, jsonify, request, send_from_directory


BASE_DIR = Path(__file__).resolve().parent
DB_PATH  = BASE_DIR / "data" / "estimates.db"

app = Flask(__name__, static_folder=None)


# ===== DB 初期化 =====
def get_db() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def init_db():
    with get_db() as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS estimates (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at    TEXT NOT NULL,
                staff         TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                proposals     TEXT NOT NULL
            )
        """)


init_db()


# ===== 静的ファイル配信 =====
@app.get("/health")
def health() -> Response:
    return Response("ok\n", mimetype="text/plain")


@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/assets/<path:filename>")
def assets(filename: str):
    return _send_subdir("assets", filename)


@app.get("/data/<path:filename>")
def data_files(filename: str):
    # DB ファイルは直接公開しない
    if filename.endswith(".db"):
        abort(404)
    return _send_subdir("data", filename)


@app.get("/templates/<path:filename>")
def template_files(filename: str):
    return _send_subdir("templates", filename)


def _send_subdir(subdir: str, filename: str):
    directory = BASE_DIR / subdir
    target = directory / filename
    if not target.is_file():
        abort(404)
    return send_from_directory(directory, filename)


# ===== 見積書 API =====
@app.post("/api/estimates")
def save_estimate():
    body = request.get_json(silent=True)
    if not body:
        abort(400)

    staff         = str(body.get("staff", "")).strip()
    customer_name = str(body.get("customer_name", "")).strip()
    proposals     = body.get("proposals")

    if not staff or not customer_name or not proposals:
        return jsonify({"error": "staff, customer_name, proposals は必須です"}), 400

    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with get_db() as con:
        cur = con.execute(
            "INSERT INTO estimates (created_at, staff, customer_name, proposals) VALUES (?,?,?,?)",
            (created_at, staff, customer_name, json.dumps(proposals, ensure_ascii=False)),
        )
        new_id = cur.lastrowid

    return jsonify({"id": new_id, "created_at": created_at}), 201


@app.get("/api/estimates")
def list_estimates():
    with get_db() as con:
        rows = con.execute(
            "SELECT id, created_at, staff, customer_name, proposals FROM estimates ORDER BY id DESC"
        ).fetchall()

    result = []
    for r in rows:
        result.append({
            "id":            r["id"],
            "created_at":    r["created_at"],
            "staff":         r["staff"],
            "customer_name": r["customer_name"],
            "proposals":     json.loads(r["proposals"]),
        })
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
