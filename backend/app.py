from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request


BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
TOOLS_PATH = PROJECT_DIR / "data" / "tools.json"
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "reviews.db"
MAX_MESSAGE_LENGTH = 280
DEFAULT_REVIEW_LIMIT = 8
MAX_REVIEW_LIMIT = 25

app = Flask(__name__)


def load_tool_ids() -> set[str]:
    with TOOLS_PATH.open("r", encoding="utf-8") as handle:
        tools = json.load(handle)
    return {str(tool["id"]) for tool in tools if tool.get("id")}


TOOL_IDS = load_tool_ids()


def get_allowed_origins() -> list[str]:
    raw = os.environ.get("ALLOWED_ORIGINS", "*").strip()
    if not raw:
        return ["*"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


ALLOWED_ORIGINS = get_allowed_origins()


def get_db() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_db() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS reviews (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              tool_id TEXT NOT NULL,
              rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
              message TEXT DEFAULT '',
              created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_reviews_tool_created ON reviews (tool_id, created_at DESC)"
        )


init_db()


def iso_utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def serialize_review(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "toolId": row["tool_id"],
        "rating": row["rating"],
        "message": row["message"],
        "createdAt": row["created_at"],
    }


def get_tool_summary(tool_id: str, connection: sqlite3.Connection) -> dict[str, Any]:
    summary_row = connection.execute(
        """
        SELECT
          tool_id,
          COUNT(*) AS review_count,
          ROUND(AVG(rating), 2) AS average_rating
        FROM reviews
        WHERE tool_id = ?
        GROUP BY tool_id
        """,
        (tool_id,),
    ).fetchone()

    if summary_row is None:
        return {
            "toolId": tool_id,
            "reviewCount": 0,
            "averageRating": None,
        }

    return {
        "toolId": summary_row["tool_id"],
        "reviewCount": summary_row["review_count"],
        "averageRating": summary_row["average_rating"],
    }


def add_cors_headers(response):
    request_origin = request.headers.get("Origin", "")
    allow_any = "*" in ALLOWED_ORIGINS

    if allow_any:
        response.headers["Access-Control-Allow-Origin"] = "*"
    elif request_origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = request_origin

    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Vary"] = "Origin"
    return response


@app.after_request
def after_request(response):
    return add_cors_headers(response)


@app.route("/api/<path:_path>", methods=["OPTIONS"])
def options_handler(_path: str):
    return ("", 204)


@app.get("/api/health")
def health():
    return jsonify(
        {
            "ok": True,
            "toolCount": len(TOOL_IDS),
            "databasePath": str(DB_PATH),
            "serverTime": iso_utc_now(),
        }
    )


@app.get("/api/reviews/summary")
def reviews_summary():
    with get_db() as connection:
        rows = connection.execute(
            """
            SELECT
              tool_id,
              COUNT(*) AS review_count,
              ROUND(AVG(rating), 2) AS average_rating
            FROM reviews
            GROUP BY tool_id
            """
        ).fetchall()

    summary_by_tool = {
        row["tool_id"]: {
            "toolId": row["tool_id"],
            "reviewCount": row["review_count"],
            "averageRating": row["average_rating"],
        }
        for row in rows
    }

    return jsonify({"items": summary_by_tool})


@app.get("/api/reviews/<tool_id>")
def reviews_for_tool(tool_id: str):
    normalized_tool_id = str(tool_id)
    if normalized_tool_id not in TOOL_IDS:
        return jsonify({"error": "Unknown tool ID."}), 404

    requested_limit = request.args.get("limit", DEFAULT_REVIEW_LIMIT, type=int) or DEFAULT_REVIEW_LIMIT
    limit = max(1, min(requested_limit, MAX_REVIEW_LIMIT))

    with get_db() as connection:
        summary = get_tool_summary(normalized_tool_id, connection)
        rows = connection.execute(
            """
            SELECT id, tool_id, rating, message, created_at
            FROM reviews
            WHERE tool_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT ?
            """,
            (normalized_tool_id, limit),
        ).fetchall()

    return jsonify(
        {
            **summary,
            "reviews": [serialize_review(row) for row in rows],
        }
    )


@app.post("/api/reviews")
def create_review():
    payload = request.get_json(silent=True) or {}
    tool_id = str(payload.get("toolId", "")).strip()
    rating = payload.get("rating")
    message = str(payload.get("message", "")).strip()

    if tool_id not in TOOL_IDS:
        return jsonify({"error": "Unknown tool ID."}), 400

    if not isinstance(rating, int) or rating < 1 or rating > 5:
        return jsonify({"error": "Rating must be an integer between 1 and 5."}), 400

    if len(message) > MAX_MESSAGE_LENGTH:
        return jsonify({"error": f"Message must be {MAX_MESSAGE_LENGTH} characters or fewer."}), 400

    created_at = iso_utc_now()

    with get_db() as connection:
        cursor = connection.execute(
            """
            INSERT INTO reviews (tool_id, rating, message, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (tool_id, rating, message, created_at),
        )
        review_id = cursor.lastrowid
        review_row = connection.execute(
            """
            SELECT id, tool_id, rating, message, created_at
            FROM reviews
            WHERE id = ?
            """,
            (review_id,),
        ).fetchone()
        summary = get_tool_summary(tool_id, connection)

    return (
        jsonify(
            {
                "review": serialize_review(review_row),
                "summary": summary,
            }
        ),
        201,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
