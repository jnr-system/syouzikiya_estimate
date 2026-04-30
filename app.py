from pathlib import Path

from flask import Flask, Response, abort, send_from_directory


BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__, static_folder=None)


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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
