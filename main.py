import os
import json
import csv
import asyncio
import re
from io import BytesIO
from io import StringIO
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, cast
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
try:
    from groq import Groq
except Exception:
    Groq = None  # type: ignore[assignment]
from dotenv import load_dotenv
from pyairtable import Api
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from reportlab.pdfgen import canvas

load_dotenv()

# Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
AIRTABLE_API_KEY = os.getenv("AIRTABLE_API_KEY")
AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID")
AIRTABLE_TABLE_NAME = os.getenv("AIRTABLE_TABLE_NAME", "ResearchSessions")
DEFAULT_USER_ID = os.getenv("API_DEFAULT_USER_ID", "local-dev")
TOKENS_RAW = os.getenv("API_TOKENS_JSON", "")
ALLOWED_ORIGINS_RAW = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
ENABLE_FALLBACK_ON_QUOTA = os.getenv("ENABLE_FALLBACK_ON_QUOTA", "true").lower() == "true"

groq_client = Groq(api_key=GROQ_API_KEY) if (Groq and GROQ_API_KEY) else None  # type: ignore[operator]
AUTH_TOKENS: Dict[str, str] = json.loads(TOKENS_RAW) if TOKENS_RAW.strip() else {}
ALLOWED_ORIGINS = [x.strip() for x in ALLOWED_ORIGINS_RAW.split(",") if x.strip()]

# Airtable Setup
airtable_api = Api(AIRTABLE_API_KEY) if AIRTABLE_API_KEY else None
table = airtable_api.table(AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME) if airtable_api and AIRTABLE_BASE_ID else None

app = FastAPI(title="Cerebro API", description="AI Research Orchestrator Backend")
ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = ROOT_DIR / "dist"
SESSION_CACHE: Dict[str, Dict[str, Any]] = {}
PROVIDER_ISSUES: Dict[str, Dict[str, str]] = {}

# Rate Limiter Setup (Mimics n8n 5000ms delay)
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

def _typed_rate_limit_handler(request: Request, exc: Exception):
    return _rate_limit_exceeded_handler(request, cast(RateLimitExceeded, exc))

app.add_exception_handler(RateLimitExceeded, _typed_rate_limit_handler)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class SubTopic(BaseModel):
    id: str
    title: str
    description: str

class ResearchOutline(BaseModel):
    title: str
    description: str
    subTopics: List[SubTopic]

class ResearchResponse(BaseModel):
    sessionId: str
    outline: ResearchOutline
    createdAt: Optional[str] = None
    tags: List[str] = []
    progress: int = 0

class PagedHistoryResponse(BaseModel):
    items: List[ResearchResponse]
    page: int
    limit: int
    total: int
    totalPages: int

class RefinementEntry(BaseModel):
    subtopic: str
    insight: str
    createdAt: Optional[str] = None

class SessionDetail(BaseModel):
    sessionId: str
    outline: ResearchOutline
    createdAt: Optional[str] = None
    refinements: List[RefinementEntry] = []
    summary: Optional[str] = None
    tags: List[str] = []

class ResearchRequest(BaseModel):
    topic: str

class RefineRequest(BaseModel):
    sessionId: str
    subtopic: str

class RefineResponse(BaseModel):
    sessionId: str
    subtopic: str
    insight: str

class FinalizeRequest(BaseModel):
    sessionId: str
    tags: Optional[List[str]] = None

class FinalizeResponse(BaseModel):
    sessionId: str
    summary: str
    tags: List[str]

# System Prompt
SYSTEM_PROMPT = """
You are the Cerebro Research Decomposer. Your goal is to take a research topic and break it down into a structured map of knowledge.

Output must be in valid JSON format.
Follow this schema:
{
  "title": "Main Topic Title",
  "description": "A high-level overview of the topic (2-3 sentences).",
  "subTopics": [
    {
      "id": "1",
      "title": "Subtopic Label",
      "description": "A brief summary of why this subtopic matters."
    }
  ]
}

Constraints:
1. Provide exactly 4-6 subtopics.
2. Ensure descriptions are concise and informative.
3. Only return the JSON object. No Markdown headers or code blocks.
"""

REFINEMENT_PROMPT = """
You are a research analyst. Given a topic and a selected subtopic, provide a concise deep-dive insight.
Return ONLY JSON with this schema:
{
  "insight": "A concise, practical deep dive (4-7 sentences)."
}
"""

FINALIZE_PROMPT = """
You are a research summarizer. Given a topic and collected findings, produce a final summary and tags.
Return ONLY JSON with this schema:
{
  "summary": "A concise final synthesis (5-8 sentences).",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
Constraints:
1. Return 4-8 tags.
2. Tags should be short, title-case, and non-duplicated.
"""

START_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "subTopics": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                },
                "required": ["id", "title", "description"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["title", "description", "subTopics"],
    "additionalProperties": False,
}

REFINE_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "insight": {"type": "string"},
    },
    "required": ["insight"],
    "additionalProperties": False,
}

FINALIZE_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["summary", "tags"],
    "additionalProperties": False,
}

def _parse_data_blob(fields: Dict[str, Any]) -> Dict[str, Any]:
    default_outline = {
        "title": fields.get("Topic", "Untitled"),
        "description": fields.get("Initial Outline", ""),
        "subTopics": [],
    }

    if "Data" not in fields:
        return {
            "outline": default_outline,
            "refinements": [],
            "summary": "",
            "tags": [],
        }

    parsed = json.loads(fields["Data"])
    if isinstance(parsed, dict) and "outline" in parsed:
        return {
            "outline": parsed.get("outline", default_outline),
            "refinements": parsed.get("refinements", []),
            "summary": parsed.get("summary", ""),
            "tags": parsed.get("tags", []),
        }

    # Backward compatibility for older records where Data == outline payload
    return {
        "outline": parsed,
        "refinements": [],
        "summary": "",
        "tags": [],
    }

def _build_session_formula(session_id: str, user_id: str) -> str:
    return f"AND({{Session ID}} = '{session_id}', {{User ID}} = '{user_id}')"

def _escape_formula(value: str) -> str:
    return value.replace("'", "\\'")

def _resolve_user_id(request: Request) -> str:
    auth_header = request.headers.get("authorization", "")
    if AUTH_TOKENS:
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing bearer token.")
        token = auth_header.removeprefix("Bearer ").strip()
        user_id = AUTH_TOKENS.get(token)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token.")
        return user_id
    if auth_header.startswith("Bearer ") and auth_header.removeprefix("Bearer ").strip():
        return DEFAULT_USER_ID
    return DEFAULT_USER_ID

def _progress_for(data: Dict[str, Any]) -> int:
    outline = data.get("outline", {})
    subtopics = outline.get("subTopics", [])
    refinements = data.get("refinements", [])
    summary = str(data.get("summary", "")).strip()
    tags = data.get("tags", [])
    progress = 25
    if subtopics:
        progress += 25
    if refinements:
        progress += 25
    if summary or tags:
        progress += 25
    return min(progress, 100)

def _require_table():
    if not table:
        raise HTTPException(status_code=503, detail="Airtable not configured.")

def _table():
    _require_table()
    return cast(Any, table)

def _require_genai():
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Groq API key not configured.")
    if groq_client is None:
        raise HTTPException(status_code=500, detail="Groq client is not initialized.")

def _set_provider_issue(provider: str, kind: str, message: str) -> None:
    PROVIDER_ISSUES[provider] = {
        "kind": kind,
        "message": message[:300],
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }

def _clear_provider_issue(provider: str) -> None:
    PROVIDER_ISSUES.pop(provider, None)

def _is_quota_error(err: Exception) -> bool:
    text = str(err).lower()
    return (
        "resource_exhausted" in text
        or "quota exceeded" in text
        or "429" in text
        or "rate limit" in text
        or "too many requests" in text
    )

class _LLMTextResponse:
    def __init__(self, text: str):
        self.text = text

def _fallback_outline(topic: str) -> Dict[str, Any]:
    base = topic.strip() or "Research Topic"
    return {
        "title": base.title(),
        "description": (
            "This is a fallback outline generated locally because LLM quota is currently exhausted. "
            "It still provides a structured map so you can continue your workflow."
        ),
        "subTopics": [
            {"id": "1", "title": "Core Concepts", "description": f"Define the foundations of {base}."},
            {"id": "2", "title": "Current Landscape", "description": f"Understand where {base} stands today."},
            {"id": "3", "title": "Practical Applications", "description": f"Identify real-world uses of {base}."},
            {"id": "4", "title": "Risks and Constraints", "description": f"Analyze challenges and limits in {base}."},
            {"id": "5", "title": "Future Outlook", "description": f"Explore likely next developments in {base}."},
        ],
    }

def _fallback_refinement(subtopic: str, topic: str) -> str:
    return (
        f"Fallback deep-dive for '{subtopic}' under '{topic}'. "
        "LLM quota is exhausted, so this insight is generated locally to keep progress moving. "
        "Focus on definitions, current patterns, measurable outcomes, constraints, and practical next steps."
    )

def _fallback_finalize(outline: Dict[str, Any], refinements: List[Dict[str, Any]]) -> Dict[str, Any]:
    title = outline.get("title", "Untitled Topic")
    summary = (
        f"This session on {title} was finalized with local fallback logic due to LLM quota exhaustion. "
        "You have a clear topic framing, subtopic breakdown, and stored refinements to continue analysis."
    )
    tags = [x.get("title", "") for x in outline.get("subTopics", [])[:5]]
    tags = [t for t in tags if t] or ["Research", "Fallback", "Analysis"]
    return {"summary": summary, "tags": tags}

async def _generate_content_with_retry(
    contents: str,
    *,
    max_retries: int = 1,
    wait_ms: int = 10000,
    response_json_schema: Optional[Dict[str, Any]] = None,
):
    """
    Send request to Groq with one controlled retry.
    If quota/rate limit is hit, wait up to wait_ms before retrying once.
    """
    last_error: Optional[Exception] = None
    for attempt in range(max_retries + 1):
        try:
            completion = groq_client.chat.completions.create(  # type: ignore[union-attr]
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": "Return only valid JSON."},
                    {"role": "user", "content": contents},
                ],
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            text = completion.choices[0].message.content or "{}"
            return _LLMTextResponse(text)
        except Exception as err:
            last_error = err
            if _is_quota_error(err) and attempt < max_retries:
                # Respect provider hint when present, but never wait less than wait_ms.
                txt = str(err)
                delay_ms = wait_ms
                m = re.search(r"retry in ([0-9]+(?:\.[0-9]+)?)s", txt, flags=re.IGNORECASE)
                if m:
                    hinted_ms = int(float(m.group(1)) * 1000)
                    delay_ms = max(wait_ms, hinted_ms)
                await asyncio.sleep(delay_ms / 1000)
                continue
            raise
    if last_error:
        raise last_error
    raise RuntimeError("LLM request failed unexpectedly.")

def _matches_filters(outline: Dict[str, Any], tags: List[str], category_values: List[str], search: str) -> bool:
    if category_values:
        tag_l = [t.lower() for t in tags]
        if not any(any(cat in t for t in tag_l) for cat in category_values):
            return False

    if search:
        title = str(outline.get("title", "")).lower()
        description = str(outline.get("description", "")).lower()
        subtopics = [str(x.get("title", "")).lower() for x in outline.get("subTopics", [])]
        tags_l = [t.lower() for t in tags]
        if (
            search not in title
            and search not in description
            and all(search not in x for x in subtopics)
            and all(search not in x for x in tags_l)
        ):
            return False
    return True

def _build_history_formula(user_id: str, category_values: List[str], search: str) -> str:
    clauses = [f"{{User ID}} = '{_escape_formula(user_id)}'"]
    if category_values:
        tag_clauses = [f"FIND('{_escape_formula(cat)}', LOWER({{Tags}}))" for cat in category_values]
        clauses.append(f"OR({','.join(tag_clauses)})")
    if search:
        s = _escape_formula(search)
        clauses.append(
            "OR("
            f"FIND('{s}', LOWER({{Topic}})),"
            f"FIND('{s}', LOWER({{Subtopics}})),"
            f"FIND('{s}', LOWER({{Summary}})),"
            f"FIND('{s}', LOWER({{Tags}}))"
            ")"
        )
    return f"AND({','.join(clauses)})"

def _build_history_items(user_id: str, category: str, search: str, limit: Optional[int] = None) -> List[ResearchResponse]:
    normalized_category = category.strip().lower()
    category_values = [] if (not normalized_category or normalized_category == "all") else [c.strip() for c in normalized_category.split(",") if c.strip()]
    normalized_search = search.strip().lower()
    formula = _build_history_formula(user_id, category_values, normalized_search)
    try:
        records = _table().all(
            formula=formula,
            max_records=limit,
        )
    except Exception:
        # Backward compatibility with bases that don't have optional computed fields (e.g., Tags/Summary/Search Text).
        records = _table().all(
            formula=f"{{User ID}} = '{_escape_formula(user_id)}'",
            max_records=limit,
        )

    items: List[ResearchResponse] = []
    for r in records:
        fields = r["fields"]
        data = _parse_data_blob(fields)
        outline = data["outline"]
        tags = [str(x).strip() for x in data.get("tags", []) if str(x).strip()]

        if not _matches_filters(outline, tags, category_values, normalized_search):
            continue

        items.append(ResearchResponse.model_validate({
            "sessionId": fields.get("Session ID") or r.get("id") or "UNKNOWN",
            "outline": ResearchOutline.model_validate(outline),
            "createdAt": fields.get("Created Time") or r.get("createdTime"),
            "tags": tags,
            "progress": _progress_for(data),
        }))
    return items

def _find_session_record(session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    if not table:
        return None
    # Primary lookup by Session ID field.
    records = _table().all(formula=_build_session_formula(_escape_formula(session_id), _escape_formula(user_id)), max_records=1)
    if records:
        return records[0]

    # Fallback lookup by Airtable record id when Session ID is computed/non-writable.
    try:
        rec = _table().get(session_id)
        if rec and rec.get("fields", {}).get("User ID") == user_id:
            return rec
    except Exception:
        pass
    return None

def _strip_invalid_airtable_field(err: Exception, payload: Dict[str, Any]) -> bool:
    """
    Remove one invalid/non-writable field from payload if error message identifies it.
    Returns True when a field was removed and caller can retry.
    """
    text = str(err)
    marker_unknown = 'Unknown field name: "'
    marker_computed = 'Field "'
    marker_computed_suffix = '" cannot accept a value because the field is computed'

    if marker_unknown in text:
        field = text.split(marker_unknown, 1)[1].split('"', 1)[0]
        if field in payload:
            payload.pop(field, None)
            return True

    if marker_computed in text and marker_computed_suffix in text:
        field = text.split(marker_computed, 1)[1].split('"', 1)[0]
        if field in payload:
            payload.pop(field, None)
            return True

    # Some bases use restricted single-select fields (e.g., Status) and reject new values.
    # Drop Status so core Data updates can still persist.
    if "INVALID_MULTIPLE_CHOICE_OPTIONS" in text and "Status" in payload:
        payload.pop("Status", None)
        return True

    return False

def _create_record_resilient(fields: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create Airtable record while tolerating schema drift (unknown/computed fields).
    """
    attempt_fields = dict(fields)
    for _ in range(8):
        try:
            return _table().create(attempt_fields)
        except Exception as e:
            if _strip_invalid_airtable_field(e, attempt_fields):
                continue
            raise
    raise RuntimeError("Unable to create Airtable record after removing invalid fields.")

def _update_record_resilient(record_id: str, fields: Dict[str, Any]) -> None:
    """
    Update Airtable record while tolerating schema drift (unknown/computed fields).
    """
    attempt_fields = dict(fields)
    for _ in range(8):
        try:
            _table().update(record_id, attempt_fields)
            return
        except Exception as e:
            if _strip_invalid_airtable_field(e, attempt_fields):
                continue
            raise
    # Last resort: keep critical state update only.
    _table().update(record_id, {"Data": fields.get("Data", "{}"), "Status": fields.get("Status", "Updated")})

def _cache_get(session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    item = SESSION_CACHE.get(session_id)
    if not item:
        return None
    if item.get("user_id") != user_id:
        return None
    return item

def _cache_put(session_id: str, user_id: str, data: Dict[str, Any], created_at: Optional[str] = None) -> None:
    SESSION_CACHE[session_id] = {
        "user_id": user_id,
        "created_at": created_at or datetime.now(timezone.utc).isoformat(),
        "data": data,
    }

@app.post("/research/start", response_model=ResearchResponse)
@limiter.limit("1/5seconds")
async def start_research(request: Request, payload: ResearchRequest):
    _require_genai()
    user_id = _resolve_user_id(request)

    try:
        try:
            response = await _generate_content_with_retry(
                f"{SYSTEM_PROMPT}\n\nUSER TOPIC: {payload.topic}",
                max_retries=1,
                wait_ms=10000,
                response_json_schema=START_SCHEMA,
            )
            raw_data = json.loads(response.text or "{}")
            _clear_provider_issue("llm")
        except Exception as llm_error:
            if _is_quota_error(llm_error) and ENABLE_FALLBACK_ON_QUOTA:
                _set_provider_issue("llm", "quota", str(llm_error))
                raw_data = _fallback_outline(payload.topic)
            elif _is_quota_error(llm_error):
                _set_provider_issue("llm", "quota", str(llm_error))
                raise HTTPException(
                    status_code=429,
                    detail=(
                        "LLM quota exhausted. Add billing or a new API key, or enable fallback mode "
                        "with ENABLE_FALLBACK_ON_QUOTA=true."
                    ),
                )
            else:
                _set_provider_issue("llm", "error", str(llm_error))
                raise

        try:
            generated_session_id = f"SESS-{os.urandom(4).hex().upper()}"
            
            session_payload = {
                "outline": raw_data,
                "refinements": [],
                "summary": "",
                "tags": [],
            }

            session_id = generated_session_id
            if table:
                try:
                    subtopics_list = ", ".join([s["title"] for s in raw_data.get("subTopics", [])])
                    create_fields = {
                        "Session ID": session_id,
                        "User ID": user_id,
                        "Topic": payload.topic,
                        "Subtopics": subtopics_list,
                        "Initial Outline": raw_data.get("description", ""),
                        "Summary": "",
                        "Tags": "",
                        "Search Text": f"{payload.topic} {subtopics_list} {raw_data.get('description', '')}",
                        "Status": "Initialized",
                        "Data": json.dumps(session_payload),
                    }
                    rec = _create_record_resilient(create_fields)
                    rec_fields = rec.get("fields", {})
                    # Airtable bases often use a computed Session ID (e.g., from RECORD_ID()).
                    # Always return the persisted value so refine/finalize can resolve the same record.
                    persisted_session_id = rec_fields.get("Session ID") or rec.get("id")
                    if persisted_session_id:
                        session_id = str(persisted_session_id)
                except Exception as ae:
                    _set_provider_issue("airtable", "write_error", str(ae))
                    print(f"Airtable Storage Error: {str(ae)}")
            _cache_put(session_id, user_id, session_payload)
            
            return ResearchResponse(
                sessionId=session_id,
                outline=ResearchOutline.model_validate(raw_data),
                tags=[],
                progress=50,
            )
        except json.JSONDecodeError:
            print(f"JSON Decode Error. Raw AI Response: {response.text}")
            raise HTTPException(status_code=500, detail="AI returned invalid data format.")

    except Exception as e:
        import traceback
        traceback.print_exc()
        
        # Specific handling for LLM quota issues
        if "429" in str(e) or "ResourceExhausted" in str(e):
            _set_provider_issue("llm", "quota", str(e))
            raise HTTPException(
                status_code=429, 
                detail="LLM API quota exhausted. Add billing/key or use fallback mode."
            )
            
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/research/history", response_model=List[ResearchResponse])
async def get_history(request: Request, category: str = "All", search: str = ""):
    _require_table()
    user_id = _resolve_user_id(request)
    
    try:
        items = _build_history_items(user_id, category, search)
        _clear_provider_issue("airtable")
        return items
    except Exception as e:
        _set_provider_issue("airtable", "read_error", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")

@app.get("/research/history/paged", response_model=PagedHistoryResponse)
async def get_history_paged(
    request: Request,
    category: str = "All",
    search: str = "",
    page: int = 1,
    limit: int = 12,
):
    _require_table()
    user_id = _resolve_user_id(request)
    try:
        safe_page = max(1, page)
        safe_limit = min(max(1, limit), 100)
        fetch_limit = safe_page * safe_limit + 1
        items = _build_history_items(user_id, category, search, limit=fetch_limit)
        start = (safe_page - 1) * safe_limit
        end = start + safe_limit
        paged_items = items[start:end]
        has_more = len(items) > end
        total = start + len(paged_items) + (1 if has_more else 0)
        total_pages = safe_page + (1 if has_more else 0)
        response = PagedHistoryResponse(
            items=paged_items,
            page=safe_page,
            limit=safe_limit,
            total=total,
            totalPages=total_pages,
        )
        _clear_provider_issue("airtable")
        return response
    except Exception as e:
        _set_provider_issue("airtable", "read_error", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to fetch paged history: {str(e)}")

@app.get("/research/categories", response_model=List[str])
async def get_history_categories(request: Request):
    _require_table()
    user_id = _resolve_user_id(request)
    try:
        records = _table().all(formula=f"{{User ID}} = '{_escape_formula(user_id)}'", max_records=500)
        categories: List[str] = []
        seen = set()
        for r in records:
            data = _parse_data_blob(r["fields"])
            for tag in data.get("tags", []):
                tag_s = str(tag).strip()
                if not tag_s:
                    continue
                key = tag_s.lower()
                if key in seen:
                    continue
                seen.add(key)
                categories.append(tag_s)
        categories.sort()
        _clear_provider_issue("airtable")
        return categories
    except Exception as e:
        _set_provider_issue("airtable", "read_error", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to fetch categories: {str(e)}")

@app.get("/research/session/{session_id}", response_model=SessionDetail)
async def get_session(session_id: str, request: Request):
    user_id = _resolve_user_id(request)
    try:
        cached = _cache_get(session_id, user_id)
        if cached:
            cached_data = cast(Dict[str, Any], cached.get("data", {}))
            return SessionDetail(
                sessionId=session_id,
                outline=ResearchOutline.model_validate(cached_data.get("outline", {})),
                createdAt=cached.get("created_at"),
                refinements=[RefinementEntry.model_validate(x) for x in cached_data.get("refinements", [])],
                summary=cached_data.get("summary") or None,
                tags=cached_data.get("tags", []),
            )

        _require_table()
        record = _find_session_record(session_id, user_id)
        if not record:
            raise HTTPException(status_code=404, detail="Session not found.")
        fields = record["fields"]
        data = _parse_data_blob(fields)
        return SessionDetail(
            sessionId=fields.get("Session ID") or record.get("id", session_id),
            outline=ResearchOutline.model_validate(data["outline"]),
            createdAt=fields.get("Created Time") or record.get("createdTime"),
            refinements=[RefinementEntry.model_validate(x) for x in data["refinements"]],
            summary=data["summary"] or None,
            tags=data["tags"],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch session: {str(e)}")

@app.post("/research/refine", response_model=RefineResponse)
@limiter.limit("1/5seconds")
async def refine_research(request: Request, payload: RefineRequest):
    _require_genai()
    user_id = _resolve_user_id(request)

    try:
        cached = _cache_get(payload.sessionId, user_id)
        record = _find_session_record(payload.sessionId, user_id)
        if not cached and not record:
            raise HTTPException(status_code=404, detail="Session not found.")

        if cached:
            data = cast(Dict[str, Any], cached["data"])
        elif record:
            data = _parse_data_blob(record["fields"])
        else:
            raise HTTPException(status_code=404, detail="Session not found.")
        outline = data["outline"]

        try:
            response = await _generate_content_with_retry(
                (
                    f"{REFINEMENT_PROMPT}\n\n"
                    f"TOPIC: {outline.get('title', payload.subtopic)}\n"
                    f"TOPIC DESCRIPTION: {outline.get('description', '')}\n"
                    f"SELECTED SUBTOPIC: {payload.subtopic}\n"
                ),
                max_retries=1,
                wait_ms=10000,
                response_json_schema=REFINE_SCHEMA,
            )
            parsed = json.loads(response.text or "{}")
            insight = str(parsed.get("insight", "")).strip()
            _clear_provider_issue("llm")
        except Exception as llm_error:
            if _is_quota_error(llm_error) and ENABLE_FALLBACK_ON_QUOTA:
                _set_provider_issue("llm", "quota", str(llm_error))
                insight = _fallback_refinement(payload.subtopic, outline.get("title", payload.subtopic))
            elif _is_quota_error(llm_error):
                _set_provider_issue("llm", "quota", str(llm_error))
                raise HTTPException(status_code=429, detail="LLM quota exhausted. Cannot generate deep-dive.")
            else:
                _set_provider_issue("llm", "error", str(llm_error))
                raise
        if not insight:
            raise HTTPException(status_code=500, detail="AI returned an empty refinement.")

        refinements = data["refinements"]
        refinements.append({
            "subtopic": payload.subtopic,
            "insight": insight,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        })
        data["refinements"] = refinements

        cached_created_at = cached.get("created_at") if cached else None
        _cache_put(payload.sessionId, user_id, data, cast(Optional[str], cached_created_at))

        if record:
            _update_record_resilient(
                record["id"],
                {
                    "Data": json.dumps(data),
                    "Summary": data.get("summary", ""),
                    "Tags": ", ".join(data.get("tags", [])),
                    "Search Text": f"{outline.get('title', '')} {outline.get('description', '')} {payload.subtopic} {insight}",
                    "Status": "Refined",
                }
            )
            _clear_provider_issue("airtable")

        return RefineResponse(sessionId=payload.sessionId, subtopic=payload.subtopic, insight=insight)
    except HTTPException:
        raise
    except Exception as e:
        if "429" in str(e) or "ResourceExhausted" in str(e):
            _set_provider_issue("llm", "quota", str(e))
            raise HTTPException(status_code=429, detail="LLM API quota exhausted. Please try again soon.")
        _set_provider_issue("airtable", "write_error", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to refine research: {str(e)}")

@app.post("/research/finalize", response_model=FinalizeResponse)
@limiter.limit("1/5seconds")
async def finalize_research(request: Request, payload: FinalizeRequest):
    _require_genai()
    user_id = _resolve_user_id(request)

    try:
        cached = _cache_get(payload.sessionId, user_id)
        record = _find_session_record(payload.sessionId, user_id)
        if not cached and not record:
            raise HTTPException(status_code=404, detail="Session not found.")

        if cached:
            data = cast(Dict[str, Any], cached["data"])
        elif record:
            data = _parse_data_blob(record["fields"])
        else:
            raise HTTPException(status_code=404, detail="Session not found.")
        outline = data["outline"]
        refinements = data["refinements"]

        findings = [outline.get("description", "")]
        findings.extend([str(x.get("insight", "")) for x in refinements if x.get("insight")])
        findings_text = "\n".join([f"- {x}" for x in findings if x])

        try:
            response = await _generate_content_with_retry(
                (
                    f"{FINALIZE_PROMPT}\n\n"
                    f"TOPIC: {outline.get('title', 'Untitled')}\n"
                    f"FINDINGS:\n{findings_text}\n"
                ),
                max_retries=1,
                wait_ms=10000,
                response_json_schema=FINALIZE_SCHEMA,
            )
            parsed = json.loads(response.text or "{}")
            summary = str(parsed.get("summary", "")).strip()
            tags = [str(t).strip() for t in parsed.get("tags", []) if str(t).strip()]
            _clear_provider_issue("llm")
        except Exception as llm_error:
            if _is_quota_error(llm_error) and ENABLE_FALLBACK_ON_QUOTA:
                _set_provider_issue("llm", "quota", str(llm_error))
                parsed = _fallback_finalize(outline, refinements)
                summary = parsed["summary"]
                tags = parsed["tags"]
            elif _is_quota_error(llm_error):
                _set_provider_issue("llm", "quota", str(llm_error))
                raise HTTPException(status_code=429, detail="LLM quota exhausted. Cannot finalize session.")
            else:
                _set_provider_issue("llm", "error", str(llm_error))
                raise
        if not summary:
            raise HTTPException(status_code=500, detail="AI returned an empty final summary.")
        if not tags:
            tags = [x.get("title", "") for x in outline.get("subTopics", [])[:5]]
            tags = [t for t in tags if t]

        selected_tags = [str(t).strip() for t in (payload.tags or []) if str(t).strip()]
        final_tags = selected_tags if selected_tags else tags

        data["summary"] = summary
        data["tags"] = list(dict.fromkeys(final_tags))

        cached_created_at = cached.get("created_at") if cached else None
        _cache_put(payload.sessionId, user_id, data, cast(Optional[str], cached_created_at))

        if record:
            _update_record_resilient(
                record["id"],
                {
                    "Data": json.dumps(data),
                    "Summary": summary,
                    "Tags": ", ".join(data["tags"]),
                    "Search Text": f"{outline.get('title', '')} {outline.get('description', '')} {summary} {' '.join(data['tags'])}",
                    "Status": "Finalized",
                }
            )
            _clear_provider_issue("airtable")
        return FinalizeResponse(sessionId=payload.sessionId, summary=summary, tags=data["tags"])
    except HTTPException:
        raise
    except Exception as e:
        if "429" in str(e) or "ResourceExhausted" in str(e):
            _set_provider_issue("llm", "quota", str(e))
            raise HTTPException(status_code=429, detail="LLM API quota exhausted. Please try again soon.")
        _set_provider_issue("airtable", "write_error", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to finalize research: {str(e)}")

@app.get("/research/export/pdf/{session_id}")
async def export_session_pdf(session_id: str, request: Request):
    _require_table()
    user_id = _resolve_user_id(request)

    try:
        record = _find_session_record(session_id, user_id)
        if not record:
            raise HTTPException(status_code=404, detail="Session not found.")
        fields = record["fields"]
        data = _parse_data_blob(fields)
        outline = data["outline"]
        refinements = data["refinements"]
        summary = data["summary"] or outline.get("description", "")
        tags = data["tags"]

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer)
        y = 800

        def write_line(text: str, size: int = 11):
            nonlocal y
            if y < 60:
                pdf.showPage()
                y = 800
            pdf.setFont("Helvetica", size)
            pdf.drawString(50, y, text[:110])
            y -= 18

        write_line("Cerebro Research Report", 16)
        write_line(f"Session ID: {session_id}")
        write_line(f"Topic: {outline.get('title', 'Untitled')}")
        write_line("")
        write_line("Summary:", 12)
        for chunk in summary.split("\n"):
            write_line(chunk)
        write_line("")
        write_line("Subtopics:", 12)
        for sub in outline.get("subTopics", []):
            write_line(f"- {sub.get('title', '')}")
        if refinements:
            write_line("")
            write_line("Refinements:", 12)
            for ref in refinements:
                write_line(f"- {ref.get('subtopic', '')}: {ref.get('insight', '')[:90]}")
        if tags:
            write_line("")
            write_line("Tags:", 12)
            write_line(", ".join(tags))

        pdf.save()
        pdf_bytes = buffer.getvalue()
        buffer.close()

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="cerebro-{session_id}.pdf"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export PDF: {str(e)}")

@app.get("/research/export/csv")
async def export_history_csv(request: Request):
    _require_table()
    user_id = _resolve_user_id(request)
    try:
        records = _table().all(formula=f"{{User ID}} = '{_escape_formula(user_id)}'")
        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["sessionId", "createdAt", "title", "description", "subtopics", "summary", "tags"])

        for r in records:
            fields = r["fields"]
            data = _parse_data_blob(fields)
            outline = data["outline"]
            subtopics = ", ".join([x.get("title", "") for x in outline.get("subTopics", [])])
            writer.writerow([
                fields.get("Session ID", "UNKNOWN"),
                fields.get("Created Time") or r.get("createdTime") or "",
                outline.get("title", ""),
                outline.get("description", ""),
                subtopics,
                data.get("summary", ""),
                ", ".join(data.get("tags", [])),
            ])

        return Response(
            content=buffer.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="cerebro-history.csv"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export CSV: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/health/providers")
async def provider_health():
    return {
        "backend": {"status": "online"},
        "llm": {
            "provider": "groq",
            "configured": bool(GROQ_API_KEY),
            "model": f"groq:{GROQ_MODEL}",
            "fallbackOnQuota": ENABLE_FALLBACK_ON_QUOTA,
            "issue": PROVIDER_ISSUES.get("llm"),
        },
        "airtable": {
            "configured": bool(table),
            "baseId": AIRTABLE_BASE_ID or "",
            "table": AIRTABLE_TABLE_NAME,
            "issue": PROVIDER_ISSUES.get("airtable"),
        },
    }

if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/", include_in_schema=False)
    async def serve_index():
        return FileResponse(str(FRONTEND_DIST / "index.html"))

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if full_path.startswith("research") or full_path.startswith("health"):
            raise HTTPException(status_code=404, detail="Not found")

        target = FRONTEND_DIST / full_path
        if target.exists() and target.is_file():
            return FileResponse(str(target))
        return FileResponse(str(FRONTEND_DIST / "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
