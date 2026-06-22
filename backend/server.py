from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Query, Header, Response, Form
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import json
import re
import warnings
import boto3
from botocore.config import Config as BotoConfig
import base64
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta

from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build

import google.generativeai as genai


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ---------------------------------------------------------------------------
# Config & globals
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
APP_NAME = os.environ.get("APP_NAME", "life-admin")

# Single-user app: a single fixed user_id is used to scope data
DEFAULT_USER_ID = "primary-user"

# Configure the Gemini client once at import. No-op if the key is missing;
# the chat and email-scan endpoints check GEMINI_API_KEY and return 503 when unset.
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Object storage: any S3-compatible store (Cloudflare R2, AWS S3, Backblaze B2).
S3_ENDPOINT_URL = os.environ.get("S3_ENDPOINT_URL", "")  # blank for AWS S3; set for R2/B2
S3_BUCKET = os.environ.get("S3_BUCKET", "")
S3_ACCESS_KEY_ID = os.environ.get("S3_ACCESS_KEY_ID", "")
S3_SECRET_ACCESS_KEY = os.environ.get("S3_SECRET_ACCESS_KEY", "")
S3_REGION = os.environ.get("S3_REGION", "auto")
_s3_client = None

# Gmail scopes
GMAIL_SCOPES = [
    # Read-only is all the scan needs (matches the "read-only access" promise in the UI).
    "https://www.googleapis.com/auth/gmail.readonly",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(value):
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return value


def parse_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        if isinstance(value, datetime):
            dt = value
        else:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def clean_doc(doc: dict) -> dict:
    """Remove _id and ensure all datetimes are ISO strings."""
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


def _get_s3():
    """Lazily build the S3-compatible storage client (R2 / S3 / B2)."""
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    if not (S3_BUCKET and S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY):
        return None
    kwargs = {
        "aws_access_key_id": S3_ACCESS_KEY_ID,
        "aws_secret_access_key": S3_SECRET_ACCESS_KEY,
        "region_name": S3_REGION or "auto",
    }
    if S3_ENDPOINT_URL:  # R2 / B2 / Supabase need an explicit endpoint; AWS S3 does not
        kwargs["endpoint_url"] = S3_ENDPOINT_URL
        # Supabase (and R2) serve the bucket in the path, not as a subdomain
        kwargs["config"] = BotoConfig(s3={"addressing_style": "path"})
    _s3_client = boto3.client("s3", **kwargs)
    return _s3_client


def put_object(path: str, data: bytes, content_type: str) -> dict:
    s3 = _get_s3()
    if not s3:
        raise HTTPException(status_code=503, detail="Object storage not configured")
    try:
        s3.put_object(Bucket=S3_BUCKET, Key=path, Body=data, ContentType=content_type)
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        raise HTTPException(status_code=502, detail="Could not store the file")
    return {"path": path, "size": len(data)}


def get_object(path: str):
    s3 = _get_s3()
    if not s3:
        raise HTTPException(status_code=503, detail="Object storage not configured")
    obj = s3.get_object(Bucket=S3_BUCKET, Key=path)
    content_type = obj.get("ContentType", "application/octet-stream")
    return obj["Body"].read(), content_type


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class BillBase(BaseModel):
    name: str
    amount: float
    currency: str = "USD"
    due_date: str  # ISO datetime
    category: Optional[str] = "general"
    notes: Optional[str] = None
    recurring: bool = False
    frequency: Optional[Literal["weekly", "monthly", "quarterly", "yearly"]] = None


class Bill(BillBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    paid: bool = False
    paid_at: Optional[str] = None
    source: str = "manual"  # manual | gmail
    source_email_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: utc_now().isoformat())


class SubscriptionBase(BaseModel):
    name: str
    amount: float
    currency: str = "USD"
    next_renewal: str
    frequency: Literal["weekly", "monthly", "quarterly", "yearly"] = "monthly"
    category: Optional[str] = "service"
    notes: Optional[str] = None


class Subscription(SubscriptionBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    active: bool = True
    source: str = "manual"
    source_email_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: utc_now().isoformat())


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Literal["low", "medium", "high"] = "medium"
    category: Optional[str] = "general"


class Task(TaskBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    completed: bool = False
    completed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: utc_now().isoformat())


class RenewalBase(BaseModel):
    name: str
    type: str  # insurance, domain, license, membership, etc
    renewal_date: str
    amount: Optional[float] = None
    currency: str = "USD"
    notes: Optional[str] = None
    auto_renew: bool = False


class Renewal(RenewalBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    completed: bool = False
    created_at: str = Field(default_factory=lambda: utc_now().isoformat())


class DocumentMeta(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    storage_path: str
    original_filename: str
    content_type: str
    size: int
    category: str = "general"
    notes: Optional[str] = None
    is_deleted: bool = False
    created_at: str


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: Literal["user", "assistant"]
    content: str
    created_at: str = Field(default_factory=lambda: utc_now().isoformat())


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"


# ---------------------------------------------------------------------------
# Generic CRUD util
# ---------------------------------------------------------------------------
async def list_collection(coll_name: str, sort_field: Optional[str] = None, ascending: bool = True):
    cursor = db[coll_name].find({}, {"_id": 0})
    if sort_field:
        cursor = cursor.sort(sort_field, 1 if ascending else -1)
    return await cursor.to_list(2000)


# ---------------------------------------------------------------------------
# Bills routes
# ---------------------------------------------------------------------------
@api_router.get("/bills", response_model=List[Bill])
async def list_bills():
    return await list_collection("bills", sort_field="due_date")


@api_router.post("/bills", response_model=Bill)
async def create_bill(payload: BillBase):
    bill = Bill(**payload.model_dump())
    await db.bills.insert_one(bill.model_dump())
    return bill


@api_router.put("/bills/{bill_id}", response_model=Bill)
async def update_bill(bill_id: str, payload: BillBase):
    existing = await db.bills.find_one({"id": bill_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Bill not found")
    updated = {**existing, **payload.model_dump()}
    await db.bills.update_one({"id": bill_id}, {"$set": payload.model_dump()})
    return Bill(**updated)


@api_router.post("/bills/{bill_id}/toggle-paid", response_model=Bill)
async def toggle_bill_paid(bill_id: str):
    existing = await db.bills.find_one({"id": bill_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Bill not found")
    new_paid = not existing.get("paid", False)
    update = {"paid": new_paid, "paid_at": utc_now().isoformat() if new_paid else None}
    await db.bills.update_one({"id": bill_id}, {"$set": update})
    existing.update(update)
    return Bill(**existing)


@api_router.delete("/bills/{bill_id}")
async def delete_bill(bill_id: str):
    res = await db.bills.delete_one({"id": bill_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Bill not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Subscriptions routes
# ---------------------------------------------------------------------------
@api_router.get("/subscriptions", response_model=List[Subscription])
async def list_subscriptions():
    return await list_collection("subscriptions", sort_field="next_renewal")


@api_router.post("/subscriptions", response_model=Subscription)
async def create_subscription(payload: SubscriptionBase):
    sub = Subscription(**payload.model_dump())
    await db.subscriptions.insert_one(sub.model_dump())
    return sub


@api_router.put("/subscriptions/{sub_id}", response_model=Subscription)
async def update_subscription(sub_id: str, payload: SubscriptionBase):
    existing = await db.subscriptions.find_one({"id": sub_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Subscription not found")
    await db.subscriptions.update_one({"id": sub_id}, {"$set": payload.model_dump()})
    existing.update(payload.model_dump())
    return Subscription(**existing)


@api_router.post("/subscriptions/{sub_id}/toggle-active", response_model=Subscription)
async def toggle_subscription(sub_id: str):
    existing = await db.subscriptions.find_one({"id": sub_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Subscription not found")
    new_active = not existing.get("active", True)
    await db.subscriptions.update_one({"id": sub_id}, {"$set": {"active": new_active}})
    existing["active"] = new_active
    return Subscription(**existing)


@api_router.delete("/subscriptions/{sub_id}")
async def delete_subscription(sub_id: str):
    res = await db.subscriptions.delete_one({"id": sub_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Tasks routes
# ---------------------------------------------------------------------------
@api_router.get("/tasks", response_model=List[Task])
async def list_tasks():
    return await list_collection("tasks", sort_field="due_date")


@api_router.post("/tasks", response_model=Task)
async def create_task(payload: TaskBase):
    task = Task(**payload.model_dump())
    await db.tasks.insert_one(task.model_dump())
    return task


@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, payload: TaskBase):
    existing = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.tasks.update_one({"id": task_id}, {"$set": payload.model_dump()})
    existing.update(payload.model_dump())
    return Task(**existing)


@api_router.post("/tasks/{task_id}/toggle-complete", response_model=Task)
async def toggle_task(task_id: str):
    existing = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    new_completed = not existing.get("completed", False)
    update = {"completed": new_completed, "completed_at": utc_now().isoformat() if new_completed else None}
    await db.tasks.update_one({"id": task_id}, {"$set": update})
    existing.update(update)
    return Task(**existing)


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    res = await db.tasks.delete_one({"id": task_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Renewals routes
# ---------------------------------------------------------------------------
@api_router.get("/renewals", response_model=List[Renewal])
async def list_renewals():
    return await list_collection("renewals", sort_field="renewal_date")


@api_router.post("/renewals", response_model=Renewal)
async def create_renewal(payload: RenewalBase):
    renewal = Renewal(**payload.model_dump())
    await db.renewals.insert_one(renewal.model_dump())
    return renewal


@api_router.put("/renewals/{renewal_id}", response_model=Renewal)
async def update_renewal(renewal_id: str, payload: RenewalBase):
    existing = await db.renewals.find_one({"id": renewal_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Renewal not found")
    await db.renewals.update_one({"id": renewal_id}, {"$set": payload.model_dump()})
    existing.update(payload.model_dump())
    return Renewal(**existing)


@api_router.post("/renewals/{renewal_id}/toggle-complete", response_model=Renewal)
async def toggle_renewal(renewal_id: str):
    existing = await db.renewals.find_one({"id": renewal_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Renewal not found")
    new_completed = not existing.get("completed", False)
    await db.renewals.update_one({"id": renewal_id}, {"$set": {"completed": new_completed}})
    existing["completed"] = new_completed
    return Renewal(**existing)


@api_router.delete("/renewals/{renewal_id}")
async def delete_renewal(renewal_id: str):
    res = await db.renewals.delete_one({"id": renewal_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Renewal not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Documents routes
# ---------------------------------------------------------------------------
@api_router.post("/documents/upload", response_model=DocumentMeta)
async def upload_document(file: UploadFile = File(...), category: str = Form("general"), notes: str = Form("")):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    doc_id = str(uuid.uuid4())
    path = f"{APP_NAME}/{DEFAULT_USER_ID}/{doc_id}.{ext}"
    data = await file.read()
    content_type = file.content_type or "application/octet-stream"
    result = put_object(path, data, content_type)
    record = DocumentMeta(
        id=doc_id,
        storage_path=result["path"],
        original_filename=file.filename or f"document.{ext}",
        content_type=content_type,
        size=result.get("size", len(data)),
        category=category,
        notes=notes or None,
        created_at=utc_now().isoformat(),
    )
    await db.documents.insert_one(record.model_dump())
    return record


@api_router.get("/documents", response_model=List[DocumentMeta])
async def list_documents(category: Optional[str] = None):
    query = {"is_deleted": False}
    if category:
        query["category"] = category
    docs = await db.documents.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.get("/documents/{doc_id}/download")
async def download_document(doc_id: str):
    record = await db.documents.find_one({"id": doc_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Document not found")
    data, content_type = get_object(record["storage_path"])
    return Response(
        content=data,
        media_type=record.get("content_type", content_type),
        headers={"Content-Disposition": f'inline; filename="{record["original_filename"]}"'},
    )


@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    res = await db.documents.update_one({"id": doc_id}, {"$set": {"is_deleted": True}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Dashboard summary
# ---------------------------------------------------------------------------
@api_router.get("/dashboard/summary")
async def dashboard_summary():
    now = utc_now()
    in_7 = now + timedelta(days=7)
    in_30 = now + timedelta(days=30)

    bills = await db.bills.find({}, {"_id": 0}).to_list(2000)
    subs = await db.subscriptions.find({}, {"_id": 0}).to_list(2000)
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(2000)
    renewals = await db.renewals.find({}, {"_id": 0}).to_list(2000)
    docs_count = await db.documents.count_documents({"is_deleted": False})

    upcoming_bills = []
    overdue_bills = []
    for b in bills:
        if b.get("paid"):
            continue
        due = parse_date(b.get("due_date"))
        if not due:
            continue
        if due < now:
            overdue_bills.append(b)
        elif due <= in_30:
            upcoming_bills.append(b)

    upcoming_subs = []
    for s in subs:
        if not s.get("active", True):
            continue
        nr = parse_date(s.get("next_renewal"))
        if nr and nr <= in_30:
            upcoming_subs.append(s)

    upcoming_tasks = []
    for t in tasks:
        if t.get("completed"):
            continue
        d = parse_date(t.get("due_date"))
        if d and d <= in_30:
            upcoming_tasks.append(t)

    upcoming_renewals = []
    for r in renewals:
        if r.get("completed"):
            continue
        d = parse_date(r.get("renewal_date"))
        if d and d <= in_30:
            upcoming_renewals.append(r)

    monthly_spend = sum(
        s.get("amount", 0) if s.get("frequency") == "monthly"
        else (s.get("amount", 0) / 12 if s.get("frequency") == "yearly"
              else s.get("amount", 0) * 4 if s.get("frequency") == "weekly"
              else s.get("amount", 0) / 3 if s.get("frequency") == "quarterly"
              else 0)
        for s in subs if s.get("active", True)
    )

    upcoming_bills.sort(key=lambda x: x.get("due_date", ""))
    upcoming_subs.sort(key=lambda x: x.get("next_renewal", ""))
    upcoming_tasks.sort(key=lambda x: x.get("due_date", ""))
    upcoming_renewals.sort(key=lambda x: x.get("renewal_date", ""))

    return {
        "stats": {
            "active_bills": len([b for b in bills if not b.get("paid")]),
            "overdue_bills": len(overdue_bills),
            "active_subscriptions": len([s for s in subs if s.get("active", True)]),
            "pending_tasks": len([t for t in tasks if not t.get("completed")]),
            "upcoming_renewals": len([r for r in renewals if not r.get("completed")]),
            "documents_count": docs_count,
            "estimated_monthly_subscription_spend": round(monthly_spend, 2),
        },
        "overdue_bills": overdue_bills[:10],
        "upcoming_bills": upcoming_bills[:10],
        "upcoming_subscriptions": upcoming_subs[:10],
        "upcoming_tasks": upcoming_tasks[:10],
        "upcoming_renewals": upcoming_renewals[:10],
    }


# ---------------------------------------------------------------------------
# Calendar feed (combined upcoming items)
# ---------------------------------------------------------------------------
@api_router.get("/calendar")
async def calendar_feed(days: int = Query(60)):
    now = utc_now()
    until = now + timedelta(days=days)
    events: List[dict] = []

    async for b in db.bills.find({}, {"_id": 0}):
        d = parse_date(b.get("due_date"))
        if d and d <= until:
            events.append({
                "id": f"bill-{b['id']}", "type": "bill", "title": b.get("name"),
                "date": b.get("due_date"), "amount": b.get("amount"),
                "currency": b.get("currency"), "status": "paid" if b.get("paid") else ("overdue" if d < now else "upcoming"),
            })
    async for s in db.subscriptions.find({}, {"_id": 0}):
        d = parse_date(s.get("next_renewal"))
        if d and d <= until and s.get("active", True):
            events.append({
                "id": f"sub-{s['id']}", "type": "subscription", "title": s.get("name"),
                "date": s.get("next_renewal"), "amount": s.get("amount"),
                "currency": s.get("currency"), "status": "upcoming",
            })
    async for t in db.tasks.find({}, {"_id": 0}):
        d = parse_date(t.get("due_date"))
        if d and d <= until and not t.get("completed"):
            events.append({
                "id": f"task-{t['id']}", "type": "task", "title": t.get("title"),
                "date": t.get("due_date"), "priority": t.get("priority"),
                "status": "upcoming",
            })
    async for r in db.renewals.find({}, {"_id": 0}):
        d = parse_date(r.get("renewal_date"))
        if d and d <= until and not r.get("completed"):
            events.append({
                "id": f"renewal-{r['id']}", "type": "renewal", "title": r.get("name"),
                "date": r.get("renewal_date"), "amount": r.get("amount"),
                "currency": r.get("currency"), "renewal_type": r.get("type"),
                "status": "upcoming",
            })

    events.sort(key=lambda x: x.get("date", ""))
    return {"events": events}


# ---------------------------------------------------------------------------
# AI Chat (Claude Sonnet 4.5)
# ---------------------------------------------------------------------------
async def build_context_summary() -> str:
    """Snapshot of user's data so the AI is grounded in their actual life admin."""
    summary_resp = await dashboard_summary()
    stats = summary_resp["stats"]
    lines = [
        f"User stats: {stats['active_bills']} active bills, {stats['overdue_bills']} overdue, "
        f"{stats['active_subscriptions']} subscriptions (~${stats['estimated_monthly_subscription_spend']}/mo), "
        f"{stats['pending_tasks']} pending tasks, {stats['upcoming_renewals']} upcoming renewals, "
        f"{stats['documents_count']} documents."
    ]
    if summary_resp["overdue_bills"]:
        lines.append("Overdue bills: " + ", ".join(
            f"{b['name']} ({b['currency']} {b['amount']} due {b.get('due_date','')[:10]})"
            for b in summary_resp["overdue_bills"][:5]
        ))
    if summary_resp["upcoming_bills"]:
        lines.append("Upcoming bills (30d): " + ", ".join(
            f"{b['name']} (due {b.get('due_date','')[:10]})"
            for b in summary_resp["upcoming_bills"][:5]
        ))
    if summary_resp["upcoming_subscriptions"]:
        lines.append("Upcoming subscriptions: " + ", ".join(
            f"{s['name']} ({s.get('frequency')}, renews {s.get('next_renewal','')[:10]})"
            for s in summary_resp["upcoming_subscriptions"][:5]
        ))
    if summary_resp["upcoming_tasks"]:
        lines.append("Upcoming tasks: " + ", ".join(
            f"{t['title']} (due {t.get('due_date','')[:10]})"
            for t in summary_resp["upcoming_tasks"][:5]
        ))
    if summary_resp["upcoming_renewals"]:
        lines.append("Upcoming renewals: " + ", ".join(
            f"{r['name']} ({r.get('type')}, renews {r.get('renewal_date','')[:10]})"
            for r in summary_resp["upcoming_renewals"][:5]
        ))
    return "\n".join(lines)


@api_router.post("/chat")
async def chat(req: ChatRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI assistant not configured")

    user_msg = ChatMessage(role="user", content=req.message)
    await db.chat_messages.insert_one(user_msg.model_dump())

    context = await build_context_summary()
    system_prompt = (
        "You are 'Atlas', a calm, highly organized personal life-admin assistant. "
        "You help the user manage bills, subscriptions, tasks, renewals, and documents. "
        "Be warm, concise, and practical. Format dates as 'Mon DD, YYYY'. "
        "When the user asks 'what's due', look at the data context below. "
        "Never invent data that isn't in the context. If something isn't tracked, suggest adding it.\n\n"
        f"--- LIVE DATA CONTEXT ---\n{context}"
    )

    try:
        model = genai.GenerativeModel(GEMINI_MODEL, system_instruction=system_prompt)
        result = await model.generate_content_async(req.message)
        reply = result.text
    except Exception as e:
        logger.error(f"AI chat failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)[:200]}")

    asst_msg = ChatMessage(role="assistant", content=str(reply))
    await db.chat_messages.insert_one(asst_msg.model_dump())
    return {"message": asst_msg.model_dump(), "user_message": user_msg.model_dump()}


@api_router.get("/chat/history")
async def chat_history(session_id: str = "default", limit: int = 100):
    msgs = await db.chat_messages.find({}, {"_id": 0}).sort("created_at", 1).to_list(limit)
    return {"messages": msgs}


@api_router.delete("/chat/history")
async def clear_chat():
    await db.chat_messages.delete_many({})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Gmail OAuth + scan
# ---------------------------------------------------------------------------
def _redirect_uri() -> str:
    backend = os.environ.get("PUBLIC_BACKEND_URL") or ""
    if backend:
        return backend.rstrip("/") + "/api/oauth/gmail/callback"
    # Fallback to the same host as the request via env, otherwise rely on FRONTEND env
    return ""


def _build_flow(redirect_uri: str) -> Flow:
    return Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri],
            }
        },
        scopes=GMAIL_SCOPES,
        redirect_uri=redirect_uri,
    )


@api_router.get("/gmail/status")
async def gmail_status():
    configured = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
    token = await db.gmail_tokens.find_one({"user_id": DEFAULT_USER_ID}, {"_id": 0})
    connected = bool(token and token.get("refresh_token"))
    return {
        "configured": configured,
        "connected": connected,
        "email": token.get("email") if token else None,
    }


@api_router.get("/oauth/gmail/login")
async def gmail_login(request_origin: Optional[str] = Query(None)):
    if not (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET):
        raise HTTPException(status_code=503, detail="Gmail OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env")
    # The OAuth callback is a BACKEND route, so the redirect URI must point at the
    # backend's own public URL (Render), not the frontend origin (Vercel). The frontend
    # origin still gets stored separately below, to redirect the user back after consent.
    backend_base = (os.environ.get("PUBLIC_BACKEND_URL") or request_origin or "").rstrip("/")
    if not backend_base:
        raise HTTPException(status_code=400, detail="Missing backend origin")
    redirect_uri = backend_base + "/api/oauth/gmail/callback"

    flow = _build_flow(redirect_uri)
    url, state = flow.authorization_url(access_type="offline", prompt="consent", include_granted_scopes="true")
    await db.oauth_states.insert_one({
        "state": state,
        "user_id": DEFAULT_USER_ID,
        "redirect_uri": redirect_uri,
        "frontend_origin": request_origin,
        "created_at": utc_now().isoformat(),
    })
    return {"auth_url": url}


@api_router.get("/oauth/gmail/callback")
async def gmail_callback(code: str, state: str):
    record = await db.oauth_states.find_one({"state": state}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired state")
    redirect_uri = record["redirect_uri"]
    flow = _build_flow(redirect_uri)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        flow.fetch_token(code=code)
    creds = flow.credentials

    # fetch user email
    email = None
    try:
        oauth_service = build("oauth2", "v2", credentials=creds)
        info = oauth_service.userinfo().get().execute()
        email = info.get("email")
    except Exception as e:
        logger.warning(f"could not fetch user email: {e}")

    expires = creds.expiry
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    token_doc = {
        "user_id": DEFAULT_USER_ID,
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "expires_at": expires.isoformat() if expires else None,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "token_uri": "https://oauth2.googleapis.com/token",
        "scopes": list(creds.scopes or GMAIL_SCOPES),
        "email": email,
        "updated_at": utc_now().isoformat(),
    }
    await db.gmail_tokens.update_one({"user_id": DEFAULT_USER_ID}, {"$set": token_doc}, upsert=True)
    await db.oauth_states.delete_one({"state": state})

    # redirect back to frontend
    frontend = record.get("frontend_origin") or os.environ.get("PUBLIC_FRONTEND_URL", "")
    target = (frontend.rstrip("/") + "/settings?gmail=connected") if frontend else "/settings?gmail=connected"
    return RedirectResponse(target)


async def _get_gmail_creds() -> Optional[Credentials]:
    token = await db.gmail_tokens.find_one({"user_id": DEFAULT_USER_ID}, {"_id": 0})
    if not token:
        return None
    creds = Credentials(
        token=token.get("access_token"),
        refresh_token=token.get("refresh_token"),
        token_uri=token.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=token.get("client_id"),
        client_secret=token.get("client_secret"),
        scopes=token.get("scopes", GMAIL_SCOPES),
    )
    expires = parse_date(token.get("expires_at"))
    if (expires and utc_now() >= expires) or not creds.token:
        try:
            creds.refresh(GoogleRequest())
            await db.gmail_tokens.update_one(
                {"user_id": DEFAULT_USER_ID},
                {"$set": {
                    "access_token": creds.token,
                    "expires_at": creds.expiry.replace(tzinfo=timezone.utc).isoformat() if creds.expiry else None,
                }},
            )
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            return None
    return creds


@api_router.post("/gmail/disconnect")
async def gmail_disconnect():
    await db.gmail_tokens.delete_many({"user_id": DEFAULT_USER_ID})
    return {"ok": True}


def _decode_gmail_body(payload: dict) -> str:
    """Recursively extract text/plain or text/html from a gmail message payload."""
    if not payload:
        return ""
    mime_type = payload.get("mimeType", "")
    body = payload.get("body", {})
    if body.get("data") and mime_type.startswith("text/"):
        try:
            decoded = base64.urlsafe_b64decode(body["data"]).decode("utf-8", errors="ignore")
            if mime_type == "text/html":
                # crude html strip
                decoded = re.sub(r"<[^>]+>", " ", decoded)
                decoded = re.sub(r"\s+", " ", decoded).strip()
            return decoded
        except Exception:
            return ""
    parts = payload.get("parts", []) or []
    # prefer text/plain
    for p in parts:
        if p.get("mimeType") == "text/plain":
            t = _decode_gmail_body(p)
            if t:
                return t
    for p in parts:
        text = _decode_gmail_body(p)
        if text:
            return text
    return ""


def _gmail_headers(payload: dict) -> dict:
    headers = {}
    for h in payload.get("headers", []) or []:
        headers[h.get("name", "").lower()] = h.get("value", "")
    return headers


@api_router.post("/gmail/scan")
async def gmail_scan(max_results: int = Query(20, ge=1, le=50)):
    creds = await _get_gmail_creds()
    if not creds:
        raise HTTPException(status_code=400, detail="Gmail not connected")
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI parser not configured")

    service = build("gmail", "v1", credentials=creds)

    query = ("newer_than:90d ("
             "subject:(invoice OR receipt OR bill OR payment OR subscription OR renewal OR "
             "due OR statement OR \"order confirmation\" OR auto-renewal) OR "
             "from:(billing OR no-reply OR noreply OR receipts OR invoice))")
    listing = service.users().messages().list(userId="me", q=query, maxResults=max_results).execute()
    msg_refs = listing.get("messages", []) or []

    found = []
    seen_ids = set()
    for ref in msg_refs:
        mid = ref["id"]
        if mid in seen_ids:
            continue
        seen_ids.add(mid)
        # skip already-imported
        existing = await db.bills.find_one({"source_email_id": mid}, {"_id": 0}) or \
                   await db.subscriptions.find_one({"source_email_id": mid}, {"_id": 0})
        if existing:
            continue

        full = service.users().messages().get(userId="me", id=mid, format="full").execute()
        payload = full.get("payload", {})
        headers = _gmail_headers(payload)
        body_text = _decode_gmail_body(payload)[:6000]
        snippet = full.get("snippet", "")

        prompt = (
            "Extract life-admin information from this email. "
            "Return STRICT JSON with this schema:\n"
            "{ \"type\": \"bill\"|\"subscription\"|\"receipt\"|\"none\", "
            "\"vendor\": string|null, "
            "\"amount\": number|null, "
            "\"currency\": string|null, "
            "\"due_date\": ISO-date|null, "
            "\"renewal_date\": ISO-date|null, "
            "\"frequency\": \"weekly\"|\"monthly\"|\"quarterly\"|\"yearly\"|null, "
            "\"category\": string|null, "
            "\"notes\": string|null }\n"
            "Rules: If the email is a one-time bill/invoice with a due date -> type=bill. "
            "If it's about a recurring subscription -> type=subscription. "
            "If it's a past receipt with no future action -> type=receipt. "
            "If unrelated -> type=none. Only respond with JSON, no markdown.\n\n"
            f"Subject: {headers.get('subject','')}\n"
            f"From: {headers.get('from','')}\n"
            f"Date: {headers.get('date','')}\n"
            f"Snippet: {snippet}\n"
            f"Body: {body_text}"
        )

        try:
            extractor = genai.GenerativeModel(
                GEMINI_MODEL,
                system_instruction="You are a precise email data extractor. Output only valid JSON.",
            )
            raw = await extractor.generate_content_async(
                prompt,
                generation_config={"response_mime_type": "application/json"},
            )
            text = (raw.text or "").strip()
            # strip markdown fences in case the model still wraps the JSON
            text = re.sub(r"^```(?:json)?", "", text).strip()
            text = re.sub(r"```$", "", text).strip()
            data = json.loads(text)
        except Exception as e:
            logger.warning(f"AI parse failed for {mid}: {e}")
            continue

        item_type = data.get("type")
        vendor = data.get("vendor") or headers.get("from", "Unknown")[:80]

        if item_type == "bill" and data.get("due_date"):
            bill = Bill(
                name=vendor,
                amount=float(data.get("amount") or 0),
                currency=(data.get("currency") or "USD").upper()[:3],
                due_date=str(data["due_date"]),
                category=data.get("category") or "general",
                notes=data.get("notes"),
                source="gmail",
                source_email_id=mid,
            )
            await db.bills.insert_one(bill.model_dump())
            found.append({"type": "bill", **bill.model_dump()})
        elif item_type == "subscription" and (data.get("renewal_date") or data.get("due_date")):
            sub = Subscription(
                name=vendor,
                amount=float(data.get("amount") or 0),
                currency=(data.get("currency") or "USD").upper()[:3],
                next_renewal=str(data.get("renewal_date") or data.get("due_date")),
                frequency=data.get("frequency") or "monthly",
                category=data.get("category") or "service",
                notes=data.get("notes"),
                source="gmail",
                source_email_id=mid,
            )
            await db.subscriptions.insert_one(sub.model_dump())
            found.append({"type": "subscription", **sub.model_dump()})
        # receipts and 'none' are ignored for now

    return {"scanned": len(msg_refs), "imported": len(found), "items": found}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Life Admin Assistant API", "version": "1.0.0"}


# ---------------------------------------------------------------------------
# App wiring
# ---------------------------------------------------------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Storage and AI clients are built lazily on first use; nothing to warm up here.
    logger.info("Atlas API started")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
