"""
Mock DRES (Distributed Retrieval Evaluation Server) for AIC 2025
Based on the API specification from HD-ChungKet.pdf
Using FastAPI
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
import time
import json
from pathlib import Path
from datetime import datetime

# Load configuration from JSON file
config_path = Path(__file__).parent / "dres_config.json"
with open(config_path, 'r') as f:
    config = json.load(f)

# Extract config values
users = config.get("users", {})
evaluations = config.get("evaluations", {})
scoring_config = config.get("scoring", {})
server_config = config.get("server", {})

app = FastAPI(
    title=server_config.get("title", "Mock DRES Server"),
    version=server_config.get("version", "1.0.0"),
    description=server_config.get("description", "Test server for development")
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
sessions: Dict[str, Dict] = {}
submissions: List[Dict] = []


# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    id: str
    username: str
    role: str
    sessionId: str


class EvaluationInfo(BaseModel):
    id: str
    name: str
    type: str
    status: str


class KISAnswer(BaseModel):
    mediaItemName: str
    start: str
    end: str


class TextAnswer(BaseModel):
    text: str


class AnswerSet(BaseModel):
    answers: List[Any]


class SubmitRequest(BaseModel):
    answerSets: List[AnswerSet]


class SubmitResponse(BaseModel):
    submissionId: str
    status: str
    submission: str  # "CORRECT" or "WRONG" - used by frontend
    description: str  # Human-readable message
    score: float
    timestamp: str


@app.get("/")
async def root():
    """Root endpoint with API documentation"""
    example_user = next(iter(users.values()), None)
    example_creds = {
        "username": example_user["username"],
        "password": example_user["password"]
    } if example_user else {}

    return {
        "message": server_config.get("title", "Mock DRES Server"),
        "version": server_config.get("version", "1.0.0"),
        "description": server_config.get("description", ""),
        "endpoints": {
            "POST /api/v2/login": "Login and get session ID",
            "GET /api/v2/client/evaluation/list": "Get list of evaluations",
            "POST /api/v2/submit/{evaluation_id}": "Submit answer",
            "GET /api/v2/user": "Get user info",
            "GET /config": "View current config (debug)",
            "POST /config/reload": "Reload config from file (debug)",
            "GET /submissions": "View all submissions (debug)",
            "POST /submissions/clear": "Clear all submissions (debug)",
            "GET /health": "Health check"
        },
        "example_credentials": example_creds,
        "available_users": list(users.keys()),
        "available_evaluations": list(evaluations.keys())
    }


@app.post("/api/v2/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Login endpoint
    Request: {"username": "<username>", "password": "<password>"}
    Response: {"id": "<id>", "username": "<username>", "role": "PARTICIPANT", "sessionId": "<sessionID>"}
    """
    if request.username not in users:
        raise HTTPException(status_code=401, detail="Invalid username")

    user = users[request.username]
    if user['password'] != request.password:
        raise HTTPException(status_code=401, detail="Invalid password")

    # Generate session ID
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "user_id": user['id'],
        "username": request.username,
        "created_at": datetime.now().isoformat(),
        "active_evaluation": "eval-001"
    }

    return LoginResponse(
        id=user['id'],
        username=request.username,
        role=user['role'],
        sessionId=session_id
    )


@app.get("/api/v2/client/evaluation/list", response_model=List[EvaluationInfo])
async def get_evaluation_list(session: str = Query(...)):
    """
    Get evaluation list
    Params: {"session": "<sessionID>"}
    Response: [{"id": "<evaluationID>", "name": "<evaluation_name>", "type": "SYNCHRONOUS", "status": "ACTIVE"}]
    """
    if not session or session not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")

    eval_list = [
        EvaluationInfo(
            id=eval_id,
            name=eval_data['name'],
            type=eval_data['type'],
            status=eval_data['status']
        )
        for eval_id, eval_data in evaluations.items()
    ]

    return eval_list


@app.post("/api/v2/submit/{evaluation_id}", response_model=SubmitResponse)
async def submit_answer(
    evaluation_id: str,
    request: SubmitRequest,
    session: str = Query(...)
):
    """
    Submit answer endpoint
    Params: {"session": "<sessionID>"}
    Body (KIS): {"answerSets": [{"answers": [{"mediaItemName": "<VIDEO_ID>", "start": "<TIME(ms)>", "end": "<TIME(ms)>"}]}]}
    Body (QA): {"answerSets": [{"answers": [{"text": "QA-<ANSWER>-<VIDEO_ID>-<TIME(ms)>"}]}]}
    Body (TRAKE): {"answerSets": [{"answers": [{"text": "TR-<VIDEO_ID>-<FRAME_ID1>,<FRAME_ID2>,..."}]}]}
    """
    if not session or session not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")

    if evaluation_id not in evaluations:
        raise HTTPException(status_code=404, detail="Invalid evaluation ID")

    if not request.answerSets:
        raise HTTPException(status_code=400, detail="No answer sets provided")

    answers = request.answerSets[0].answers
    if not answers:
        raise HTTPException(status_code=400, detail="No answers provided")

    # Determine submission type
    submission_type = "UNKNOWN"
    is_correct = False

    first_answer = answers[0]

    # Check if it's a text-based answer (QA or TRAKE)
    if isinstance(first_answer, dict) and 'text' in first_answer:
        text = first_answer['text']
        if text.startswith('QA-'):
            submission_type = "QA"
            # Mock: mark as correct if properly formatted
            parts = text.split('-')
            is_correct = len(parts) >= 4  # QA-ANSWER-VIDEO_ID-TIME
        elif text.startswith('TR-'):
            submission_type = "TRAKE"
            # Mock: check if multiple frames are provided
            parts = text.split('-', 2)
            if len(parts) >= 3:
                frame_ids = parts[2].split(',')
                is_correct = len(frame_ids) >= 2
        else:
            submission_type = "TEXT"
    # Check if it's KIS format
    elif isinstance(first_answer, dict) and 'mediaItemName' in first_answer:
        submission_type = "KIS"
        # Mock: mark as correct if valid fields are present
        is_correct = 'start' in first_answer and 'end' in first_answer

    # Generate submission ID
    submission_id = str(uuid.uuid4())

    # Store submission
    submission = {
        "id": submission_id,
        "evaluation_id": evaluation_id,
        "session_id": session,
        "username": sessions[session]['username'],
        "type": submission_type,
        "data": request.dict(),
        "is_correct": is_correct,
        "timestamp": datetime.now().isoformat(),
        "submit_time_ms": int(time.time() * 1000)
    }
    submissions.append(submission)

    # Calculate score (mock scoring based on PDF formula)
    # Get scoring parameters from config
    Pmax = scoring_config.get("Pmax", 100)
    Pbase = scoring_config.get("Pbase", 50)
    Ppenalty = scoring_config.get("Ppenalty", 10)
    Ttask = scoring_config.get("Ttask_ms", 300000)  # 5 minutes in ms for most tasks (KIS/QA/TRAKE)

    # Count previous wrong submissions for this session/evaluation
    k = sum(1 for s in submissions[:-1]
            if s['session_id'] == session
            and s['evaluation_id'] == evaluation_id
            and not s['is_correct'])

    # Mock: assume some time has passed since task start
    tsubmit = 60000  # assume submitted after 1 minute

    # Calculate time-based score factor: fT(t) = 1 - (tsubmit / Ttask)
    fT = 1 - (tsubmit / Ttask)

    if is_correct:
        # Score = max(0, Pbase + (Pmax - Pbase) × fT(t) - k × Ppenalty)
        score = max(0, Pbase + (Pmax - Pbase) * fT - k * Ppenalty)
        submission_status = "CORRECT"
        description = f"Submission accepted! Score: {score:.2f} points. Type: {submission_type}"
    else:
        score = 0
        submission_status = "WRONG"
        description = f"Incorrect submission. Type: {submission_type}. Please try again."

    return SubmitResponse(
        submissionId=submission_id,
        status="SUCCESS",  # HTTP-level status
        submission=submission_status,  # "CORRECT" or "WRONG" - used by frontend
        description=description,
        score=score,
        timestamp=submission['timestamp']
    )


@app.get("/api/v2/user")
async def get_user_info():
    """
    Get current user info (for getting sessionId from web interface)
    """
    # This would normally use cookies/auth headers
    # For testing, we'll return a mock session
    return {
        "id": "user-001",
        "username": "team1",
        "role": "PARTICIPANT",
        "sessionId": "test-session-id"
    }


@app.get("/submissions")
async def get_submissions():
    """
    Helper endpoint to view all submissions (not part of official API)
    """
    return submissions


@app.post("/submissions/clear")
async def clear_submissions():
    """
    Helper endpoint to clear all submissions (not part of official API)
    """
    global submissions
    submissions = []
    return {"message": "Submissions cleared"}


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {
        "status": "healthy",
        "sessions": len(sessions),
        "evaluations": len(evaluations),
        "submissions": len(submissions),
        "timestamp": datetime.now().isoformat()
    }


@app.get("/config")
async def get_config():
    """
    Get current configuration (debug endpoint)
    """
    return {
        "users": {k: {**v, "password": "***"} for k, v in users.items()},  # Hide passwords
        "evaluations": evaluations,
        "scoring": scoring_config,
        "server": server_config
    }


@app.post("/config/reload")
async def reload_config():
    """
    Reload configuration from dres_config.json (debug endpoint)
    """
    global users, evaluations, scoring_config, server_config, config

    try:
        with open(config_path, 'r') as f:
            config = json.load(f)

        users = config.get("users", {})
        evaluations = config.get("evaluations", {})
        scoring_config = config.get("scoring", {})
        server_config = config.get("server", {})

        return {
            "status": "success",
            "message": "Configuration reloaded",
            "users_count": len(users),
            "evaluations_count": len(evaluations)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reload config: {str(e)}")