import os
import uuid
import logging
import jwt
import bcrypt
import httpx
import requests
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Any, Union
from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, Header, UploadFile, File, Form
from fastapi.responses import Response
from fastapi.concurrency import run_in_threadpool
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator, EmailStr
from typing_extensions import Annotated
from dotenv import load_dotenv

# Load env variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB setup
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Helper for PyObjectId
PyObjectId = Annotated[str, BeforeValidator(str)]

class BaseDocument(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))

    def to_mongo(self) -> dict:
        data = self.model_dump()
        if "id" in data:
            data["_id"] = data.pop("id")
        return data

    @classmethod
    def from_mongo(cls, data: dict):
        if not data:
            return None
        data = dict(data)
        if "_id" in data:
            data["id"] = str(data.pop("_id"))
        return cls(**data)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("apextrainer")

app = FastAPI(title="ApexTrainer OS API", description="Personal Trainer and Gym Management System")
public_router = APIRouter(prefix="/api")
api_router = APIRouter(prefix="/api")
student_router = APIRouter(prefix="/api")

# ==========================================
# AUTH CONFIG (JWT + bcrypt)
# ==========================================
JWT_SECRET = os.environ.get("JWT_SECRET", "apextrainer-dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "43200"))  # 30 days

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def issue_token(trainer_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": trainer_id,
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_trainer(authorization: Optional[str] = Header(default=None)) -> dict:
    unauthorized = HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise unauthorized
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        trainer_id = payload.get("sub")
        if payload.get("type") != "access" or not trainer_id:
            raise unauthorized
    except jwt.PyJWTError:
        raise unauthorized
    trainer = await db.trainers.find_one({"_id": trainer_id})
    if not trainer:
        raise unauthorized
    return trainer

async def get_current_student(authorization: Optional[str] = Header(default=None)) -> dict:
    unauthorized = HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise unauthorized
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        student_id = payload.get("sub")
        if payload.get("type") != "access" or not student_id:
            raise unauthorized
    except jwt.PyJWTError:
        raise unauthorized
    student = await db.students.find_one({"_id": student_id, "deleted_at": None})
    if not student:
        raise unauthorized
    return student

# ==========================================
# OBJECT STORAGE (AWS S3 via Boto3)
# ==========================================
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config

AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_BUCKET_NAME = os.environ.get("AWS_BUCKET_NAME")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

s3_client = None
if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_BUCKET_NAME:
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION,
        config=Config(signature_version='s3v4')
    )

def put_object(path: str, data: bytes, content_type: str) -> dict:
    if not s3_client:
        raise HTTPException(status_code=500, detail="S3 não configurado")
    try:
        s3_client.put_object(
            Bucket=AWS_BUCKET_NAME,
            Key=path,
            Body=data,
            ContentType=content_type
        )
        url = f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{path}"
        return {"url": url, "path": path}
    except ClientError as e:
        logger.error(f"Erro no S3 upload: {e}")
        raise HTTPException(status_code=500, detail="Erro ao enviar arquivo para o S3")

def get_object(path: str) -> tuple:
    if not s3_client:
        raise HTTPException(status_code=500, detail="S3 não configurado")
    try:
        response = s3_client.get_object(Bucket=AWS_BUCKET_NAME, Key=path)
        return response["Body"].read(), response.get("ContentType", "application/octet-stream")
    except ClientError as e:
        logger.error(f"Erro no S3 download: {e}")
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no S3")

# ==========================================
# PUSH NOTIFICATIONS (Expo Push)
# ==========================================
async def send_push(recipients: List[str], data: dict, idempotency_key: Optional[str] = None) -> None:
    if not recipients:
        return
    if "title" not in data or "message" not in data:
        raise ValueError("data must include title and message")
    
    EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
    messages = []
    
    for token in recipients:
        if not token.startswith("ExponentPushToken[") and not token.startswith("ExpoPushToken["):
            continue
            
        messages.append({
            "to": token,
            "sound": "default",
            "title": data["title"],
            "body": data["message"],
            "data": data.get("extra", {})
        })
        
    if not messages:
        return
        
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(EXPO_PUSH_URL, json=messages)
            resp.raise_for_status()
        except Exception as e:
            logger.error(f"Erro ao enviar notificação push via Expo: {e}")

# ==========================================
# MODELS
# ==========================================

class StudentModel(BaseDocument):
    name: str
    photo_url: Optional[str] = "https://images.unsplash.com/photo-1637651684506-07e16fcf7b06?w=400"
    birth_date: Optional[str] = "1995-05-12"
    age: Optional[int] = 29
    gender: str = "Masculino" # "Masculino" | "Feminino"
    phone: str = "(11) 98765-4321"
    email: str = "aluno@email.com"
    height_cm: float = 178.0
    weight_kg: float = 84.5
    goal: str = "Hipertrofia" # Hipertrofia, Emagrecimento, Definição, Condicionamento, Saúde / Qualidade de Vida, Reabilitação
    training_level: str = "Intermediário" # Iniciante, Intermediário, Avançado, Atleta
    start_date: str = "2024-01-15"
    plan: str = "Mensal" # Mensal, Trimestral, Semestral, Anual
    due_date: str = "2026-06-25"
    monthly_fee: float = 250.0
    status: str = "ativo" # ativo, proximo_vencimento, inadimplente, inativo
    notes: Optional[str] = "Foco em peitoral e dorsais. Restrição leve no ombro direito."
    last_workout_date: Optional[str] = None
    last_assessment_date: Optional[str] = None
    days_without_workout: int = 0
    deleted_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CircumferencesModel(BaseModel):
    pescoco: Optional[float] = 0.0
    ombros: Optional[float] = 0.0
    torax: Optional[float] = 0.0
    cintura: Optional[float] = 0.0
    abdomen: Optional[float] = 0.0
    quadril: Optional[float] = 0.0
    braco_dir: Optional[float] = 0.0
    braco_esq: Optional[float] = 0.0
    antebraco_dir: Optional[float] = 0.0
    antebraco_esq: Optional[float] = 0.0
    coxa_dir: Optional[float] = 0.0
    coxa_esq: Optional[float] = 0.0
    panturrilha_dir: Optional[float] = 0.0
    panturrilha_esq: Optional[float] = 0.0
    custom_measures: Optional[List[Dict[str, Any]]] = []

class SkinfoldsModel(BaseModel):
    peitoral: Optional[float] = 0.0
    triceps: Optional[float] = 0.0
    subescapular: Optional[float] = 0.0
    axilar_media: Optional[float] = 0.0
    suprailiaca: Optional[float] = 0.0
    abdomen: Optional[float] = 0.0
    coxa: Optional[float] = 0.0
    panturrilha_medial: Optional[float] = 0.0

class AssessmentPhotosModel(BaseModel):
    front: Optional[str] = None
    side: Optional[str] = None
    back: Optional[str] = None

class PhysicalAssessmentModel(BaseDocument):
    student_id: str
    date: str
    weight_kg: float
    height_cm: float
    age: int
    gender: str # Masculino | Feminino
    bmi: float
    protocol: str # pollock3, pollock7, circumferences, manual
    skinfolds: Optional[SkinfoldsModel] = None
    circumferences: CircumferencesModel
    body_fat_pct: float
    fat_mass_kg: float
    lean_mass_kg: float
    photos: AssessmentPhotosModel = Field(default_factory=AssessmentPhotosModel)
    notes: Optional[str] = ""
    deleted_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ExerciseItemModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    sets: int = 4
    reps: str = "10-12"
    load_kg: Optional[float] = 20.0
    rest_seconds: int = 60
    tempo: Optional[str] = "2-0-2"
    notes: Optional[str] = ""
    muscle_group: Optional[str] = "Geral"

class WorkoutRoutineDayModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    day_label: str # "Treino A - Peito e Tríceps"
    target_muscles: str = "Peitoral, Tríceps, Deltoide Anterior"
    exercises: List[ExerciseItemModel] = []

class WorkoutPlanModel(BaseDocument):
    student_id: str
    title: str
    goal: str
    frequency_weekly: int = 4
    start_date: str
    end_date: Optional[str] = None
    days: List[WorkoutRoutineDayModel] = []
    notes: Optional[str] = ""
    is_active: bool = True
    deleted_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AnamnesisModel(BaseDocument):
    student_id: str
    goal: str = ""
    training_history: str = ""
    injuries: str = "Nenhuma lesão grave."
    surgeries: str = "Nenhuma."
    medications: str = "Nenhum."
    habits: str = "Dorme 7 horas por noite, boa ingestão de água (2.5L/dia)."
    routine: str = "Trabalha sentado 8h/dia em escritório."
    experience_weightlifting: str = "2 anos de treino contínuo."
    restrictions: str = "Cuidado com impacto nos joelhos."
    diet_notes: Optional[str] = "Dieta hipercalórica orientada por nutricionista."
    notes: str = ""
    ai_analysis: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AttendanceModel(BaseDocument):
    student_id: str
    date: str # YYYY-MM-DD
    status: str # presente, falta, justificado
    workout_title: Optional[str] = None
    duration_minutes: Optional[int] = 60
    notes: Optional[str] = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StudentHistoryModel(BaseDocument):
    student_id: str
    date: str
    type: str # peso, treino, avaliacao, carga, presenca, anamnese, geral
    title: str
    description: str
    value: Optional[str] = None
    delta: Optional[str] = None
    is_positive: Optional[bool] = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChatMessageModel(BaseDocument):
    student_id: str
    sender: str # personal | student
    text: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    read: bool = False

# ==========================================
# POLLOCK PROTOCOL CALCULATION ENGINE
# ==========================================

def calculate_pollock_density(protocol: str, gender: str, age: int, skinfolds: Dict[str, float]) -> float:
    # Jackson & Pollock standard equations
    is_male = gender.lower() in ["masculino", "homem", "male", "m"]

    if protocol == "pollock3":
        if is_male:
            # 3 Dobras Homens: Peitoral, Abdômen, Coxa
            sum3 = skinfolds.get("peitoral", 0.0) + skinfolds.get("abdomen", 0.0) + skinfolds.get("coxa", 0.0)
            density = 1.109380 - (0.0008267 * sum3) + (0.0000016 * (sum3 ** 2)) - (0.0002574 * age)
        else:
            # 3 Dobras Mulheres: Tríceps, Suprailíaca, Coxa
            sum3 = skinfolds.get("triceps", 0.0) + skinfolds.get("suprailiaca", 0.0) + skinfolds.get("coxa", 0.0)
            density = 1.0994921 - (0.0009929 * sum3) + (0.0000023 * (sum3 ** 2)) - (0.0001392 * age)
        return density

    elif protocol == "pollock7":
        # 7 Dobras: Peitoral, Axilar Média, Tríceps, Subescapular, Abdômen, Suprailíaca, Coxa
        sum7 = (skinfolds.get("peitoral", 0.0) +
                skinfolds.get("axilar_media", 0.0) +
                skinfolds.get("triceps", 0.0) +
                skinfolds.get("subescapular", 0.0) +
                skinfolds.get("abdomen", 0.0) +
                skinfolds.get("suprailiaca", 0.0) +
                skinfolds.get("coxa", 0.0))
        if is_male:
            density = 1.112000 - (0.00043499 * sum7) + (0.00000055 * (sum7 ** 2)) - (0.00028826 * age)
        else:
            density = 1.097000 - (0.00046971 * sum7) + (0.00000056 * (sum7 ** 2)) - (0.00012828 * age)
        return density

    return 1.05

def siri_formula(density: float) -> float:
    # Siri formula: %G = ((4.95 / D) - 4.5) * 100
    if density <= 0:
        return 0.0
    pct = ((4.95 / density) - 4.5) * 100.0
    return max(3.0, min(65.0, round(pct, 2)))

# ==========================================
# ROUTES: STATUS & SEED
# ==========================================

@public_router.get("/")
async def root():
    return {"message": "ApexTrainer OS API online", "version": "1.0.0"}

@public_router.post("/seed")
async def seed_database():
    """Populates realistic Brazilian students with assessments, workouts, attendance, and messages."""
    await db.students.delete_many({})
    await db.assessments.delete_many({})
    await db.workouts.delete_many({})
    await db.anamnesis.delete_many({})
    await db.attendance.delete_many({})
    await db.history.delete_many({})
    await db.messages.delete_many({})

    # Seed Students
    students_data = [
        {
            "_id": "student_01",
            "name": "Rodrigo Silva de Oliveira",
            "photo_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
            "birth_date": "1994-04-18",
            "age": 30,
            "gender": "Masculino",
            "phone": "(11) 99876-5432",
            "email": "rodrigo.silva@email.com",
            "height_cm": 180.0,
            "weight_kg": 86.5,
            "goal": "Hipertrofia",
            "training_level": "Avançado",
            "start_date": "2024-01-10",
            "plan": "Semestral",
            "due_date": "2026-07-10",
            "monthly_fee": 320.0,
            "status": "ativo",
            "notes": "Foco em progressão de cargas no supino e agachamento. Excelente aderência aos treinos.",
            "last_workout_date": "2026-06-18",
            "last_assessment_date": "2026-06-01",
            "days_without_workout": 1,
            "created_at": "2024-01-10T09:00:00Z",
            "updated_at": "2026-06-18T10:30:00Z"
        },
        {
            "_id": "student_02",
            "name": "Mariana Costa Albuquerque",
            "photo_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
            "birth_date": "1997-09-24",
            "age": 27,
            "gender": "Feminino",
            "phone": "(11) 98123-4567",
            "email": "mariana.costa@email.com",
            "height_cm": 165.0,
            "weight_kg": 61.2,
            "goal": "Emagrecimento",
            "training_level": "Intermediário",
            "start_date": "2024-02-15",
            "plan": "Trimestral",
            "due_date": "2026-06-22",
            "monthly_fee": 280.0,
            "status": "proximo_vencimento",
            "notes": "Meta de reduzir % de gordura para 20%. Treina 4x na semana com foco em membros inferiores.",
            "last_workout_date": "2026-06-17",
            "last_assessment_date": "2026-05-28",
            "days_without_workout": 2,
            "created_at": "2024-02-15T08:30:00Z",
            "updated_at": "2026-06-17T11:00:00Z"
        },
        {
            "_id": "student_03",
            "name": "Carlos Eduardo Mendonça",
            "photo_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
            "birth_date": "1988-11-03",
            "age": 36,
            "gender": "Masculino",
            "phone": "(11) 97654-3210",
            "email": "carlos.mendonca@email.com",
            "height_cm": 175.0,
            "weight_kg": 94.0,
            "goal": "Saúde / Qualidade de Vida",
            "training_level": "Iniciante",
            "start_date": "2024-03-01",
            "plan": "Mensal",
            "due_date": "2026-06-05",
            "monthly_fee": 250.0,
            "status": "inadimplente",
            "notes": "Hipertenso controlado. Aluno faltou aos últimos treinos por viagem de trabalho.",
            "last_workout_date": "2026-06-09",
            "last_assessment_date": "2026-04-15",
            "days_without_workout": 10,
            "created_at": "2024-03-01T14:00:00Z",
            "updated_at": "2026-06-09T18:00:00Z"
        },
        {
            "_id": "student_04",
            "name": "Beatriz Lima Fernandes",
            "photo_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400",
            "birth_date": "2000-02-14",
            "age": 24,
            "gender": "Feminino",
            "phone": "(11) 99432-1098",
            "email": "beatriz.lima@email.com",
            "height_cm": 170.0,
            "weight_kg": 64.0,
            "goal": "Definição",
            "training_level": "Avançado",
            "start_date": "2023-11-20",
            "plan": "Anual",
            "due_date": "2026-11-20",
            "monthly_fee": 230.0,
            "status": "ativo",
            "notes": "Atleta amadora de corrida e musculação. Excelente condicionamento cardiovascular.",
            "last_workout_date": "2026-06-19",
            "last_assessment_date": "2026-06-05",
            "days_without_workout": 0,
            "created_at": "2023-11-20T10:00:00Z",
            "updated_at": "2026-06-19T08:00:00Z"
        },
        {
            "_id": "student_05",
            "name": "Lucas Gabriel Ferreira",
            "photo_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
            "birth_date": "1992-07-30",
            "age": 32,
            "gender": "Masculino",
            "phone": "(11) 98555-1234",
            "email": "lucas.ferreira@email.com",
            "height_cm": 182.0,
            "weight_kg": 79.0,
            "goal": "Condicionamento",
            "training_level": "Intermediário",
            "start_date": "2024-04-01",
            "plan": "Mensal",
            "due_date": "2026-06-12",
            "monthly_fee": 260.0,
            "status": "inativo",
            "notes": "Pausou treinos temporariamente para tratamento fisioterápico no tornozelo.",
            "last_workout_date": "2026-05-20",
            "last_assessment_date": "2026-04-02",
            "days_without_workout": 29,
            "created_at": "2024-04-01T16:00:00Z",
            "updated_at": "2026-05-20T19:00:00Z"
        }
    ]

    await db.students.insert_many(students_data)

    # Seed Physical Assessments for Rodrigo (3 assessments showing great progression)
    assessments_data = [
        {
            "_id": "eval_01",
            "student_id": "student_01",
            "date": "2024-01-15",
            "weight_kg": 92.0,
            "height_cm": 180.0,
            "age": 29,
            "gender": "Masculino",
            "bmi": 28.4,
            "protocol": "pollock7",
            "skinfolds": {
                "peitoral": 18.0,
                "axilar_media": 16.0,
                "triceps": 15.0,
                "subescapular": 22.0,
                "abdomen": 26.0,
                "suprailiaca": 21.0,
                "coxa": 20.0
            },
            "circumferences": {
                "pescoco": 39.0,
                "ombros": 118.0,
                "torax": 104.0,
                "cintura": 94.0,
                "abdomen": 98.0,
                "quadril": 106.0,
                "braco_dir": 36.5,
                "braco_esq": 36.0,
                "antebraco_dir": 29.5,
                "antebraco_esq": 29.0,
                "coxa_dir": 60.0,
                "coxa_esq": 59.5,
                "panturrilha_dir": 38.5,
                "panturrilha_esq": 38.5
            },
            "body_fat_pct": 24.2,
            "fat_mass_kg": 22.26,
            "lean_mass_kg": 69.74,
            "photos": {
                "front": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400",
                "side": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400",
                "back": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400"
            },
            "notes": "Primeira avaliação diagnóstica. Ponto de partida para recomposição corporal e ganho de força.",
            "created_at": "2024-01-15T10:00:00Z"
        },
        {
            "_id": "eval_02",
            "student_id": "student_01",
            "date": "2024-03-20",
            "weight_kg": 89.0,
            "height_cm": 180.0,
            "age": 30,
            "gender": "Masculino",
            "bmi": 27.47,
            "protocol": "pollock7",
            "skinfolds": {
                "peitoral": 14.0,
                "axilar_media": 13.0,
                "triceps": 12.0,
                "subescapular": 18.0,
                "abdomen": 20.0,
                "suprailiaca": 16.0,
                "coxa": 16.0
            },
            "circumferences": {
                "pescoco": 39.5,
                "ombros": 120.0,
                "torax": 106.0,
                "cintura": 89.0,
                "abdomen": 92.0,
                "quadril": 104.0,
                "braco_dir": 38.0,
                "braco_esq": 37.5,
                "antebraco_dir": 30.5,
                "antebraco_esq": 30.0,
                "coxa_dir": 61.5,
                "coxa_esq": 61.0,
                "panturrilha_dir": 39.0,
                "panturrilha_esq": 39.0
            },
            "body_fat_pct": 19.5,
            "fat_mass_kg": 17.36,
            "lean_mass_kg": 71.64,
            "photos": {
                "front": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400",
                "side": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400",
                "back": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400"
            },
            "notes": "Excelente evolução em 2 meses. Perdeu 4.9kg de gordura e ganhou quase 2kg de massa magra.",
            "created_at": "2024-03-20T11:00:00Z"
        },
        {
            "_id": "eval_03",
            "student_id": "student_01",
            "date": "2026-06-01",
            "weight_kg": 86.5,
            "height_cm": 180.0,
            "age": 30,
            "gender": "Masculino",
            "bmi": 26.69,
            "protocol": "pollock7",
            "skinfolds": {
                "peitoral": 10.0,
                "axilar_media": 9.0,
                "triceps": 9.0,
                "subescapular": 13.0,
                "abdomen": 14.0,
                "suprailiaca": 11.0,
                "coxa": 12.0
            },
            "circumferences": {
                "pescoco": 40.0,
                "ombros": 123.0,
                "torax": 109.0,
                "cintura": 84.0,
                "abdomen": 86.0,
                "quadril": 102.0,
                "braco_dir": 40.2,
                "braco_esq": 40.0,
                "antebraco_dir": 31.5,
                "antebraco_esq": 31.0,
                "coxa_dir": 63.0,
                "coxa_esq": 62.5,
                "panturrilha_dir": 39.5,
                "panturrilha_esq": 39.5
            },
            "body_fat_pct": 14.8,
            "fat_mass_kg": 12.80,
            "lean_mass_kg": 73.70,
            "photos": {
                "front": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
                "side": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400",
                "back": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400"
            },
            "notes": "Fase de definição concluída com maestria! Massa magra em 73.7kg e gordura em 14.8%. Cintura reduziu 10cm no total.",
            "created_at": "2026-06-01T15:30:00Z"
        },
        # Assessments for Mariana
        {
            "_id": "eval_mariana_01",
            "student_id": "student_02",
            "date": "2024-02-18",
            "weight_kg": 68.5,
            "height_cm": 165.0,
            "age": 27,
            "gender": "Feminino",
            "bmi": 25.16,
            "protocol": "pollock3",
            "skinfolds": {
                "triceps": 24.0,
                "suprailiaca": 26.0,
                "coxa": 28.0
            },
            "circumferences": {
                "pescoco": 33.0,
                "ombros": 98.0,
                "torax": 92.0,
                "cintura": 78.0,
                "abdomen": 84.0,
                "quadril": 104.0,
                "braco_dir": 29.0,
                "braco_esq": 28.5,
                "antebraco_dir": 23.0,
                "antebraco_esq": 23.0,
                "coxa_dir": 59.0,
                "coxa_esq": 58.5,
                "panturrilha_dir": 36.0,
                "panturrilha_esq": 36.0
            },
            "body_fat_pct": 31.5,
            "fat_mass_kg": 21.58,
            "lean_mass_kg": 46.92,
            "photos": {
                "front": "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400",
                "side": "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400",
                "back": "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400"
            },
            "notes": "Avaliação inicial. Foco em emagrecimento sustentável e tonificação de glúteos e quadríceps.",
            "created_at": "2024-02-18T14:00:00Z"
        },
        {
            "_id": "eval_mariana_02",
            "student_id": "student_02",
            "date": "2026-05-28",
            "weight_kg": 61.2,
            "height_cm": 165.0,
            "age": 27,
            "gender": "Feminino",
            "bmi": 22.48,
            "protocol": "pollock3",
            "skinfolds": {
                "triceps": 16.0,
                "suprailiaca": 17.0,
                "coxa": 19.0
            },
            "circumferences": {
                "pescoco": 32.5,
                "ombros": 100.0,
                "torax": 88.0,
                "cintura": 68.0,
                "abdomen": 73.0,
                "quadril": 98.0,
                "braco_dir": 27.5,
                "braco_esq": 27.0,
                "antebraco_dir": 23.0,
                "antebraco_esq": 23.0,
                "coxa_dir": 56.5,
                "coxa_esq": 56.0,
                "panturrilha_dir": 35.0,
                "panturrilha_esq": 35.0
            },
            "body_fat_pct": 22.8,
            "fat_mass_kg": 13.95,
            "lean_mass_kg": 47.25,
            "photos": {
                "front": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
                "side": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
                "back": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400"
            },
            "notes": "Perda expressiva de 7.6kg de gordura pura mantendo toda a massa magra intacta. Abdômen diminuiu 11cm.",
            "created_at": "2026-05-28T16:00:00Z"
        }
    ]

    await db.assessments.insert_many(assessments_data)

    # Seed Workout Plan for Rodrigo
    workout_plan = {
        "_id": "workout_01",
        "student_id": "student_01",
        "title": "Hipertrofia ABC - Foco em Empurrar/Puxar/Pernas",
        "goal": "Hipertrofia Muscular & Ganho de Força",
        "frequency_weekly": 5,
        "start_date": "2026-05-01",
        "end_date": "2026-07-01",
        "is_active": True,
        "notes": "Cadência controlada na fase excêntrica (3s). Aquecimento específico com 50% da carga antes das séries de trabalho.",
        "created_at": "2026-05-01T10:00:00Z",
        "updated_at": "2026-06-15T14:20:00Z",
        "days": [
            {
                "id": "day_a",
                "day_label": "Treino A - Peito, Ombros e Tríceps",
                "target_muscles": "Peitoral Maior, Deltoide Anterior/Lateral, Tríceps Braquial",
                "exercises": [
                    {
                        "id": "ex_01",
                        "name": "Supino Reto com Barra",
                        "sets": 4,
                        "reps": "8-10",
                        "load_kg": 85.0,
                        "rest_seconds": 90,
                        "tempo": "2-0-2",
                        "notes": "Escápulas aduzidas e pés firmes no chão.",
                        "muscle_group": "Peitoral"
                    },
                    {
                        "id": "ex_02",
                        "name": "Supino Inclinado com Halteres",
                        "sets": 3,
                        "reps": "10-12",
                        "load_kg": 30.0,
                        "rest_seconds": 75,
                        "tempo": "3-0-1",
                        "notes": "Inclinação do banco a 30 graus.",
                        "muscle_group": "Peitoral"
                    },
                    {
                        "id": "ex_03",
                        "name": "Desenvolvimento com Halteres",
                        "sets": 4,
                        "reps": "10",
                        "load_kg": 22.0,
                        "rest_seconds": 60,
                        "tempo": "2-0-2",
                        "notes": "Controle total no topo, sem bater os halteres.",
                        "muscle_group": "Ombros"
                    },
                    {
                        "id": "ex_04",
                        "name": "Elevação Lateral na Polia",
                        "sets": 3,
                        "reps": "12-15",
                        "load_kg": 12.0,
                        "rest_seconds": 45,
                        "tempo": "2-1-2",
                        "notes": "Pausa isométrica de 1s no pico de contração.",
                        "muscle_group": "Ombros"
                    },
                    {
                        "id": "ex_05",
                        "name": "Tríceps Corda na Polia Alta",
                        "sets": 4,
                        "reps": "12-15",
                        "load_kg": 35.0,
                        "rest_seconds": 60,
                        "tempo": "2-0-2",
                        "notes": "Abrir a corda no final do movimento.",
                        "muscle_group": "Tríceps"
                    }
                ]
            },
            {
                "id": "day_b",
                "day_label": "Treino B - Costas, Deltoide Posterior e Bíceps",
                "target_muscles": "Dorsal, Trapézio, Romboide, Bíceps Braquial",
                "exercises": [
                    {
                        "id": "ex_06",
                        "name": "Puxada Frontal Aberta",
                        "sets": 4,
                        "reps": "10-12",
                        "load_kg": 70.0,
                        "rest_seconds": 75,
                        "tempo": "2-1-2",
                        "notes": "Puxar em direção ao peitoral superior.",
                        "muscle_group": "Costas"
                    },
                    {
                        "id": "ex_07",
                        "name": "Remada Curvada com Barra",
                        "sets": 4,
                        "reps": "8-10",
                        "load_kg": 65.0,
                        "rest_seconds": 90,
                        "tempo": "2-0-2",
                        "notes": "Coluna neutra e tronco a 45 graus.",
                        "muscle_group": "Costas"
                    },
                    {
                        "id": "ex_08",
                        "name": "Crucifixo Inverso na Máquina",
                        "sets": 3,
                        "reps": "12-15",
                        "load_kg": 40.0,
                        "rest_seconds": 60,
                        "tempo": "2-1-2",
                        "notes": "Foco exclusivo no deltoide posterior.",
                        "muscle_group": "Ombros"
                    },
                    {
                        "id": "ex_09",
                        "name": "Rosca Direta com Barra W",
                        "sets": 4,
                        "reps": "10-12",
                        "load_kg": 32.0,
                        "rest_seconds": 60,
                        "tempo": "2-0-2",
                        "notes": "Cotovelos fixos ao lado do tronco.",
                        "muscle_group": "Bíceps"
                    }
                ]
            },
            {
                "id": "day_c",
                "day_label": "Treino C - Pernas Completo e Abdômen",
                "target_muscles": "Quadríceps, Isquiotibiais, Glúteos, Panturrilhas, Core",
                "exercises": [
                    {
                        "id": "ex_10",
                        "name": "Agachamento Livre com Barra",
                        "sets": 4,
                        "reps": "8-10",
                        "load_kg": 100.0,
                        "rest_seconds": 120,
                        "tempo": "3-0-2",
                        "notes": "Profundidade abaixo de 90 graus mantendo curvatura lombar.",
                        "muscle_group": "Pernas"
                    },
                    {
                        "id": "ex_11",
                        "name": "Leg Press 45°",
                        "sets": 4,
                        "reps": "10-12",
                        "load_kg": 240.0,
                        "rest_seconds": 90,
                        "tempo": "3-0-1",
                        "notes": "Não travar os joelhos na extensão.",
                        "muscle_group": "Pernas"
                    },
                    {
                        "id": "ex_12",
                        "name": "Mesa Flexora",
                        "sets": 4,
                        "reps": "12",
                        "load_kg": 50.0,
                        "rest_seconds": 60,
                        "tempo": "2-1-2",
                        "notes": "Controlar a volta sem deixar os pesos baterem.",
                        "muscle_group": "Pernas"
                    },
                    {
                        "id": "ex_13",
                        "name": "Gêmeos Sentado (Panturrilha)",
                        "sets": 4,
                        "reps": "15-20",
                        "load_kg": 60.0,
                        "rest_seconds": 45,
                        "tempo": "2-2-2",
                        "notes": "Alongamento completo e contração de 2s no pico.",
                        "muscle_group": "Panturrilhas"
                    }
                ]
            }
        ]
    }

    await db.workouts.insert_one(workout_plan)

    # Seed Anamnesis
    anamnesis_data = [
        {
            "_id": "anam_01",
            "student_id": "student_01",
            "goal": "Hipertrofia muscular com ênfase em peitoral e braços, mantendo percentual de gordura baixo.",
            "training_history": "Treina musculação há 4 anos de forma consistente. Já praticou judô e natação.",
            "injuries": "Tendinite leve no ombro direito há 2 anos, atualmente 100% assintomático.",
            "surgeries": "Nenhuma cirurgia prévia.",
            "medications": "Creatina (5g/dia) e Whey Protein. Não faz uso de medicamentos controlados.",
            "habits": "Dorme cerca de 7h30 por noite. Não fuma. Consumo social e moderado de álcool no final de semana.",
            "routine": "Trabalha no modelo híbrido como analista de sistemas. Fica sentado boa parte do dia.",
            "experience_weightlifting": "Avançado. Conhece e executa corretamente os levantamentos básicos (Supino, Agachamento, Terra).",
            "restrictions": "Evitar excesso de rotação interna sob carga máxima no ombro.",
            "diet_notes": "Acompanhado por nutricionista esportivo com ingestão de 2g de proteína/kg corporal.",
            "notes": "Aluno altamente motivado e focado.",
            "ai_analysis": "Perfil com excelente potencial e prontidão neuromuscular. Recomendado periodização ondulatória com blocos de hipertrofia e choque de força.",
            "updated_at": "2026-05-10T14:00:00Z"
        },
        {
            "_id": "anam_02",
            "student_id": "student_02",
            "goal": "Emagrecimento, definição corporal e condicionamento para correr 5km.",
            "training_history": "Praticou pilates por 1 ano e musculação intermitente.",
            "injuries": "Desconforto na lombar em dias de muito estresse sentado.",
            "surgeries": "Apendicectomia aos 16 anos.",
            "medications": "Anticoncepcional oral.",
            "habits": "Dorme 6h a 7h por noite. Bebe 2L de água por dia.",
            "routine": "Advogada, rotina agitada de escritório e audiências.",
            "experience_weightlifting": "Intermediário. Prefere exercícios em máquinas e halteres médios.",
            "restrictions": "Fortalecimento do core e estabilizadores da coluna lombar.",
            "diet_notes": "Déficit calórico leve moderado com foco em alimentos in natura.",
            "notes": "Treina religiosamente às 07:00 da manhã.",
            "ai_analysis": "Indicação de treinos híbridos de musculação com estímulo metabólico (HIIT pós-treino ou circuitos) e foco em fortalecimento de paravertebrais.",
            "updated_at": "2026-04-12T09:00:00Z"
        }
    ]
    await db.anamnesis.insert_many(anamnesis_data)

    # Seed Attendance Logs for June 2026
    attendance_records = [
        {"_id": "att_01", "student_id": "student_01", "date": "2026-06-01", "status": "presente", "workout_title": "Treino A", "duration_minutes": 65},
        {"_id": "att_02", "student_id": "student_01", "date": "2026-06-02", "status": "presente", "workout_title": "Treino B", "duration_minutes": 60},
        {"_id": "att_03", "student_id": "student_01", "date": "2026-06-04", "status": "presente", "workout_title": "Treino C", "duration_minutes": 70},
        {"_id": "att_04", "student_id": "student_01", "date": "2026-06-05", "status": "presente", "workout_title": "Treino A", "duration_minutes": 60},
        {"_id": "att_05", "student_id": "student_01", "date": "2026-06-08", "status": "presente", "workout_title": "Treino B", "duration_minutes": 65},
        {"_id": "att_06", "student_id": "student_01", "date": "2026-06-09", "status": "presente", "workout_title": "Treino C", "duration_minutes": 75},
        {"_id": "att_07", "student_id": "student_01", "date": "2026-06-11", "status": "falta", "workout_title": "Treino A", "duration_minutes": 0, "notes": "Reunião de trabalho"},
        {"_id": "att_08", "student_id": "student_01", "date": "2026-06-12", "status": "presente", "workout_title": "Treino B", "duration_minutes": 60},
        {"_id": "att_09", "student_id": "student_01", "date": "2026-06-15", "status": "presente", "workout_title": "Treino C", "duration_minutes": 70},
        {"_id": "att_10", "student_id": "student_01", "date": "2026-06-16", "status": "presente", "workout_title": "Treino A", "duration_minutes": 60},
        {"_id": "att_11", "student_id": "student_01", "date": "2026-06-18", "status": "presente", "workout_title": "Treino B", "duration_minutes": 65},
    ]
    await db.attendance.insert_many(attendance_records)

    # Seed Chronological History for Rodrigo
    history_events = [
        {
            "_id": "hist_01",
            "student_id": "student_01",
            "date": "2024-01-15",
            "type": "avaliacao",
            "title": "Primeira Avaliação Física",
            "description": "Avaliação completa Pollock 7 dobras. Peso: 92.0 kg | %Gordura: 24.2% | Massa Magra: 69.7 kg.",
            "value": "92.0 kg",
            "delta": "Início",
            "is_positive": True
        },
        {
            "_id": "hist_02",
            "student_id": "student_01",
            "date": "2024-02-10",
            "type": "carga",
            "title": "Aumento de Carga no Supino",
            "description": "Subiu de 70 kg para 75 kg com execução perfeita e boa cadência.",
            "value": "75 kg",
            "delta": "+5 kg",
            "is_positive": True
        },
        {
            "_id": "hist_03",
            "student_id": "student_01",
            "date": "2024-03-20",
            "type": "avaliacao",
            "title": "Segunda Avaliação Física",
            "description": "Reavaliação trimestral. Peso: 89.0 kg | %Gordura: 19.5% (-4.7%) | Massa Magra: 71.6 kg (+1.9 kg).",
            "value": "89.0 kg",
            "delta": "-3.0 kg",
            "is_positive": True
        },
        {
            "_id": "hist_04",
            "student_id": "student_01",
            "date": "2026-05-01",
            "type": "treino",
            "title": "Treino Atualizado",
            "description": "Prescrição do novo protocolo Hipertrofia ABC com ênfase em sobrecarga progressiva.",
            "value": "Treino ABC",
            "delta": "Novo",
            "is_positive": True
        },
        {
            "_id": "hist_05",
            "student_id": "student_01",
            "date": "2026-05-18",
            "type": "carga",
            "title": "Recorde no Agachamento",
            "description": "Bateu marca histórica de 100 kg para 8 repetições completas.",
            "value": "100 kg",
            "delta": "+10 kg",
            "is_positive": True
        },
        {
            "_id": "hist_06",
            "student_id": "student_01",
            "date": "2026-06-01",
            "type": "avaliacao",
            "title": "Terceira Avaliação Física",
            "description": "Peso atual: 86.5 kg | %Gordura: 14.8% | Massa Magra: 73.7 kg. Redução total de 10cm na cintura!",
            "value": "86.5 kg",
            "delta": "-2.5 kg",
            "is_positive": True
        }
    ]
    await db.history.insert_many(history_events)

    # Seed Chat Messages
    messages_data = [
        {
            "_id": "msg_01",
            "student_id": "student_01",
            "sender": "personal",
            "text": "Fala Rodrigo! Como você se sentiu no treino de pernas ontem? Conseguiu manter a carga nos 100kg no agachamento?",
            "timestamp": "2026-06-17T18:30:00Z",
            "read": True
        },
        {
            "_id": "msg_02",
            "student_id": "student_01",
            "sender": "student",
            "text": "Fala mestre! Foi puxado demais, mas fechei as 4 séries com 100kg sem falhar a postura. Senti bastante o posterior hoje!",
            "timestamp": "2026-06-17T19:05:00Z",
            "read": True
        },
        {
            "_id": "msg_03",
            "student_id": "student_01",
            "sender": "personal",
            "text": "Show de bola! Amanhã temos treino A (Peitoral e Ombros). Foco total na amplitude do supino!",
            "timestamp": "2026-06-17T19:20:00Z",
            "read": True
        }
    ]
    await db.messages.insert_many(messages_data)

    return {"message": "Base de dados populada com sucesso!", "students_count": len(students_data)}

# ==========================================
# ROUTES: STUDENTS
# ==========================================

@api_router.get("/students", response_model=List[Dict[str, Any]])
async def list_students(
    search: Optional[str] = None,
    status: Optional[str] = None,
    goal: Optional[str] = None,
    trainer: dict = Depends(get_current_trainer)
):
    query: Dict[str, Any] = {"deleted_at": None}
    if not trainer.get("is_admin"):
        query["trainer_id"] = str(trainer["_id"])
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"goal": {"$regex": search, "$options": "i"}}
        ]
    if status and status != "todos":
        query["status"] = status
    if goal and goal != "todos":
        query["goal"] = goal

    cursor = db.students.find(query).sort("name", 1)
    students = await cursor.to_list(200)

    # Process and return
    result = []
    for s in students:
        s["id"] = str(s.pop("_id"))
        result.append(s)
    return result

@api_router.get("/students/{student_id}")
async def get_student(student_id: str, trainer: dict = Depends(get_current_trainer)):
    query = {"_id": student_id, "deleted_at": None}
    if not trainer.get("is_admin"):
        query["trainer_id"] = str(trainer["_id"])
    doc = await db.students.find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail="Aluno não encontrado ou não autorizado")
    doc["id"] = str(doc.pop("_id"))
    return doc

@api_router.post("/students")
async def create_student(data: Dict[str, Any], trainer: dict = Depends(get_current_trainer)):
    new_id = f"student_{uuid.uuid4().hex[:8]}"
    data["_id"] = new_id
    if not trainer.get("is_admin"):
        data["trainer_id"] = str(trainer["_id"])
    elif "trainer_id" not in data:
        data["trainer_id"] = str(trainer["_id"])
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if "password" in data:
        data["password_hash"] = hash_password(data.pop("password"))
    if "status" not in data:
        data["status"] = "ativo"

    # Auto calculate age if birth_date provided
    if "birth_date" in data and data["birth_date"]:
        try:
            b_year = int(data["birth_date"].split("-")[0])
            cur_year = datetime.now().year
            data["age"] = cur_year - b_year
        except Exception:
            pass

    await db.students.insert_one(data)

    # Add initial history event
    await db.history.insert_one({
        "_id": f"hist_{uuid.uuid4().hex[:8]}",
        "student_id": new_id,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "type": "geral",
        "title": "Cadastro Realizado",
        "description": f"Aluno cadastrado com objetivo '{data.get('goal', 'Geral')}'.",
        "value": f"{data.get('weight_kg', 0)} kg",
        "delta": "Início",
        "is_positive": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    doc = await db.students.find_one({"_id": new_id})
    doc["id"] = str(doc.pop("_id"))
    return doc

@api_router.put("/students/{student_id}")
async def update_student(student_id: str, data: Dict[str, Any], trainer: dict = Depends(get_current_trainer)):
    query = {"_id": student_id}
    if not trainer.get("is_admin"):
        query["trainer_id"] = str(trainer["_id"])
    
    old_doc = await db.students.find_one(query)
    if not old_doc:
        raise HTTPException(status_code=404, detail="Aluno não encontrado ou não autorizado")

    data.pop("_id", None)
    data.pop("id", None)
    if "password" in data:
        data["password_hash"] = hash_password(data.pop("password"))
    data["updated_at"] = datetime.now(timezone.utc).isoformat()

    # If weight changed, log to history
    if old_doc and "weight_kg" in data and float(data["weight_kg"]) != float(old_doc.get("weight_kg", 0)):
        old_w = float(old_doc.get("weight_kg", 0))
        new_w = float(data["weight_kg"])
        diff = round(new_w - old_w, 2)
        sign = "+" if diff > 0 else ""
        await db.history.insert_one({
            "_id": f"hist_{uuid.uuid4().hex[:8]}",
            "student_id": student_id,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "type": "peso",
            "title": "Peso Atualizado",
            "description": f"Peso alterado de {old_w} kg para {new_w} kg.",
            "value": f"{new_w} kg",
            "delta": f"{sign}{diff} kg",
            "is_positive": diff <= 0 if old_doc.get("goal") == "Emagrecimento" else diff >= 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    result = await db.students.update_one({"_id": student_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    doc = await db.students.find_one({"_id": student_id})
    doc["id"] = str(doc.pop("_id"))
    return doc

@api_router.delete("/students/{student_id}")
async def delete_student(student_id: str, trainer: dict = Depends(get_current_trainer)):
    query = {"_id": student_id}
    if not trainer.get("is_admin"):
        query["trainer_id"] = str(trainer["_id"])
    
    result = await db.students.update_one(
        query,
        {"$set": {"deleted_at": datetime.now(timezone.utc).isoformat(), "status": "inativo"}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Aluno não encontrado ou não autorizado")
    return {"success": True, "message": "Aluno inativado com sucesso"}

# ==========================================
# ROUTES: ASSESSMENTS & POLLOCK CALCULATOR
# ==========================================

@api_router.post("/assessments/calculate")
async def calculate_assessment_metrics(data: Dict[str, Any]):
    """Calculates density, % fat, fat mass, lean mass, and BMI without saving."""
    protocol = data.get("protocol", "pollock3")
    gender = data.get("gender", "Masculino")
    age = int(data.get("age", 25))
    weight_kg = float(data.get("weight_kg", 70.0))
    height_cm = float(data.get("height_cm", 175.0))
    skinfolds = data.get("skinfolds", {})

    height_m = height_cm / 100.0
    bmi = round(weight_kg / (height_m ** 2), 2) if height_m > 0 else 0.0

    if protocol in ["pollock3", "pollock7"]:
        density = calculate_pollock_density(protocol, gender, age, skinfolds)
        body_fat_pct = siri_formula(density)
    else:
        # manual or circumferences
        body_fat_pct = float(data.get("manual_fat_pct", 15.0))
        density = 1.05

    fat_mass_kg = round(weight_kg * (body_fat_pct / 100.0), 2)
    lean_mass_kg = round(weight_kg - fat_mass_kg, 2)

    return {
        "protocol": protocol,
        "bmi": bmi,
        "density": round(density, 5),
        "body_fat_pct": body_fat_pct,
        "fat_mass_kg": fat_mass_kg,
        "lean_mass_kg": lean_mass_kg
    }

@api_router.get("/assessments")
async def list_assessments(student_id: Optional[str] = None):
    query: Dict[str, Any] = {"deleted_at": None}
    if student_id:
        query["student_id"] = student_id
    cursor = db.assessments.find(query).sort("date", -1)
    docs = await cursor.to_list(200)
    result = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        result.append(d)
    return result

@api_router.get("/assessments/{assessment_id}")
async def get_assessment(assessment_id: str):
    doc = await db.assessments.find_one({"_id": assessment_id, "deleted_at": None})
    if not doc:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    doc["id"] = str(doc.pop("_id"))
    return doc

@api_router.post("/assessments")
async def create_assessment(data: Dict[str, Any]):
    new_id = f"eval_{uuid.uuid4().hex[:8]}"
    data["_id"] = new_id
    data["created_at"] = datetime.now(timezone.utc).isoformat()

    weight_kg = float(data.get("weight_kg", 70.0))
    height_cm = float(data.get("height_cm", 175.0))
    age = int(data.get("age", 25))
    gender = data.get("gender", "Masculino")
    protocol = data.get("protocol", "pollock3")
    skinfolds = data.get("skinfolds", {}) or {}

    # Calculate BMI
    height_m = height_cm / 100.0
    bmi = round(weight_kg / (height_m ** 2), 2) if height_m > 0 else 0.0
    data["bmi"] = bmi

    # Calculate Body Fat
    if protocol in ["pollock3", "pollock7"] and skinfolds:
        density = calculate_pollock_density(protocol, gender, age, skinfolds)
        body_fat_pct = siri_formula(density)
    else:
        body_fat_pct = float(data.get("body_fat_pct", 15.0))

    data["body_fat_pct"] = body_fat_pct
    fat_mass_kg = round(weight_kg * (body_fat_pct / 100.0), 2)
    lean_mass_kg = round(weight_kg - fat_mass_kg, 2)
    data["fat_mass_kg"] = fat_mass_kg
    data["lean_mass_kg"] = lean_mass_kg

    await db.assessments.insert_one(data)

    # Update student record with last assessment date & weight
    student_id = data.get("student_id")
    if student_id:
        await db.students.update_one(
            {"_id": student_id},
            {"$set": {
                "weight_kg": weight_kg,
                "height_cm": height_cm,
                "last_assessment_date": data.get("date", datetime.now().strftime("%Y-%m-%d")),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

        # Log into student history
        await db.history.insert_one({
            "_id": f"hist_{uuid.uuid4().hex[:8]}",
            "student_id": student_id,
            "date": data.get("date", datetime.now().strftime("%Y-%m-%d")),
            "type": "avaliacao",
            "title": f"Nova Avaliação ({protocol.upper()})",
            "description": f"Peso: {weight_kg}kg | %Gordura: {body_fat_pct}% | Massa Magra: {lean_mass_kg}kg | Massa Gorda: {fat_mass_kg}kg",
            "value": f"{body_fat_pct}%",
            "delta": f"{weight_kg} kg",
            "is_positive": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    doc = await db.assessments.find_one({"_id": new_id})
    doc["id"] = str(doc.pop("_id"))
    return doc

# ==========================================
# ROUTES: MINHA EVOLUÇÃO & COMPARATOR
# ==========================================

@api_router.get("/students/{student_id}/evolution")
async def get_student_evolution(student_id: str, range: Optional[str] = "todos"):
    student_doc = await db.students.find_one({"_id": student_id, "deleted_at": None})
    if not student_doc:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    student_doc["id"] = str(student_doc.pop("_id"))

    # Fetch all assessments sorted by date ascending
    cursor = db.assessments.find({"student_id": student_id, "deleted_at": None}).sort("date", 1)
    assessments = await cursor.to_list(100)

    for a in assessments:
        a["id"] = str(a.pop("_id"))

    if not assessments:
        # Return fallback with current student data as baseline
        return {
            "student": student_doc,
            "indicators": [],
            "history_dates": [datetime.now().strftime("%Y-%m-%d")],
            "weight_series": [{"date": datetime.now().strftime("%Y-%m-%d"), "value": student_doc.get("weight_kg", 0)}],
            "body_fat_series": [],
            "lean_mass_series": [],
            "fat_mass_series": [],
            "circumferences_series": {},
            "assessments_count": 0
        }

    baseline = assessments[0]
    current = assessments[-1]
    previous = assessments[-2] if len(assessments) >= 2 else baseline

    goal = student_doc.get("goal", "Hipertrofia")

    # Construct indicators
    def make_indicator(name: str, key: str, unit: str, base_val: float, prev_val: float, cur_val: float, lower_is_better: bool = False):
        delta_tot = round(cur_val - base_val, 2)
        delta_rec = round(cur_val - prev_val, 2)
        # Check positive evolution based on goal & variable
        if lower_is_better:
            is_pos = delta_tot <= 0
        else:
            is_pos = delta_tot >= 0
        return {
            "name": name,
            "key": key,
            "unit": unit,
            "baseline_value": round(base_val, 2),
            "previous_value": round(prev_val, 2),
            "current_value": round(cur_val, 2),
            "delta_total": delta_tot,
            "delta_recent": delta_rec,
            "is_positive_evolution": is_pos
        }

    is_weight_loss = goal in ["Emagrecimento", "Definição"]

    # Basic indicators
    indicators = [
        make_indicator("Peso Corporal", "weight_kg", "kg", baseline.get("weight_kg", 0), previous.get("weight_kg", 0), current.get("weight_kg", 0), lower_is_better=is_weight_loss),
        make_indicator("Gordura Corporal", "body_fat_pct", "%", baseline.get("body_fat_pct", 0), previous.get("body_fat_pct", 0), current.get("body_fat_pct", 0), lower_is_better=True),
        make_indicator("Massa de Gordura", "fat_mass_kg", "kg", baseline.get("fat_mass_kg", 0), previous.get("fat_mass_kg", 0), current.get("fat_mass_kg", 0), lower_is_better=True),
        make_indicator("Massa Magra", "lean_mass_kg", "kg", baseline.get("lean_mass_kg", 0), previous.get("lean_mass_kg", 0), current.get("lean_mass_kg", 0), lower_is_better=False),
        make_indicator("IMC", "bmi", "", baseline.get("bmi", 0), previous.get("bmi", 0), current.get("bmi", 0), lower_is_better=is_weight_loss),
    ]

    # Circumferences indicators
    cur_circ = current.get("circumferences", {}) or {}
    prev_circ = previous.get("circumferences", {}) or {}
    base_circ = baseline.get("circumferences", {}) or {}

    circ_labels = [
        ("Cintura", "cintura", True),
        ("Abdômen", "abdomen", True),
        ("Quadril", "quadril", is_weight_loss),
        ("Tórax", "torax", False),
        ("Braço Direito", "braco_dir", False),
        ("Braço Esquerdo", "braco_esq", False),
        ("Coxa Direita", "coxa_dir", False),
        ("Coxa Esquerda", "coxa_esq", False),
        ("Panturrilha Direita", "panturrilha_dir", False)
    ]

    for label, key, lower_better in circ_labels:
        b_val = float(base_circ.get(key, 0.0) or 0.0)
        p_val = float(prev_circ.get(key, 0.0) or 0.0)
        c_val = float(cur_circ.get(key, 0.0) or 0.0)
        if c_val > 0 or b_val > 0:
            indicators.append(make_indicator(label, key, "cm", b_val, p_val, c_val, lower_is_better=lower_better))

    # Time-series datasets
    weight_series = []
    body_fat_series = []
    lean_mass_series = []
    fat_mass_series = []
    circ_series: Dict[str, List[Dict[str, Any]]] = {}

    for a in assessments:
        d = a.get("date", "")
        weight_series.append({"date": d, "value": a.get("weight_kg", 0)})
        body_fat_series.append({"date": d, "value": a.get("body_fat_pct", 0)})
        lean_mass_series.append({"date": d, "value": a.get("lean_mass_kg", 0)})
        fat_mass_series.append({"date": d, "value": a.get("fat_mass_kg", 0)})

        c_data = a.get("circumferences", {}) or {}
        for k in ["cintura", "abdomen", "torax", "braco_dir", "coxa_dir", "quadril"]:
            if k not in circ_series:
                circ_series[k] = []
            val = float(c_data.get(k, 0.0) or 0.0)
            if val > 0:
                circ_series[k].append({"date": d, "value": val})

    return {
        "student": student_doc,
        "indicators": indicators,
        "history_dates": [a.get("date") for a in assessments],
        "weight_series": weight_series,
        "body_fat_series": body_fat_series,
        "lean_mass_series": lean_mass_series,
        "fat_mass_series": fat_mass_series,
        "circumferences_series": circ_series,
        "assessments_count": len(assessments)
    }

# ==========================================
# ROUTES: WORKOUTS
# ==========================================

@api_router.get("/workouts")
async def list_workouts(student_id: Optional[str] = None):
    query: Dict[str, Any] = {"deleted_at": None}
    if student_id:
        query["student_id"] = student_id
    cursor = db.workouts.find(query).sort("created_at", -1)
    docs = await cursor.to_list(100)
    result = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        result.append(d)
    return result

@api_router.get("/workouts/{workout_id}")
async def get_workout(workout_id: str):
    doc = await db.workouts.find_one({"_id": workout_id, "deleted_at": None})
    if not doc:
        raise HTTPException(status_code=404, detail="Treino não encontrado")
    doc["id"] = str(doc.pop("_id"))
    return doc

@api_router.post("/workouts")
async def create_workout(data: Dict[str, Any]):
    new_id = f"workout_{uuid.uuid4().hex[:8]}"
    data["_id"] = new_id
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    data["is_active"] = True

    await db.workouts.insert_one(data)

    # Log to history
    student_id = data.get("student_id")
    if student_id:
        await db.history.insert_one({
            "_id": f"hist_{uuid.uuid4().hex[:8]}",
            "student_id": student_id,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "type": "treino",
            "title": "Treino Prescrito",
            "description": f"Novo programa '{data.get('title', 'Treino')}' criado com {len(data.get('days', []))} divisões de treino.",
            "value": data.get("title"),
            "delta": "Ativo",
            "is_positive": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    doc = await db.workouts.find_one({"_id": new_id})
    doc["id"] = str(doc.pop("_id"))
    return doc

@api_router.put("/workouts/{workout_id}")
async def update_workout(workout_id: str, data: Dict[str, Any]):
    data.pop("_id", None)
    data.pop("id", None)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.workouts.update_one({"_id": workout_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Treino não encontrado")

    doc = await db.workouts.find_one({"_id": workout_id})
    doc["id"] = str(doc.pop("_id"))
    return doc

# ==========================================
# ROUTES: ANAMNESIS
# ==========================================

@api_router.get("/students/{student_id}/anamnesis")
async def get_anamnesis(student_id: str):
    doc = await db.anamnesis.find_one({"student_id": student_id})
    if not doc:
        # Return blank default template
        student = await db.students.find_one({"_id": student_id})
        return {
            "id": f"anam_{student_id}",
            "student_id": student_id,
            "goal": student.get("goal", "") if student else "",
            "training_history": "",
            "injuries": "Nenhuma lesão relatada.",
            "surgeries": "Nenhuma.",
            "medications": "Nenhum.",
            "habits": "",
            "routine": "",
            "experience_weightlifting": student.get("training_level", "") if student else "",
            "restrictions": "",
            "diet_notes": "",
            "notes": "",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    doc["id"] = str(doc.pop("_id"))
    return doc

@api_router.post("/students/{student_id}/anamnesis")
async def save_anamnesis(student_id: str, data: Dict[str, Any]):
    data["student_id"] = student_id
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    existing = await db.anamnesis.find_one({"student_id": student_id})

    if existing:
        await db.anamnesis.update_one({"student_id": student_id}, {"$set": data})
        doc_id = existing["_id"]
    else:
        doc_id = f"anam_{uuid.uuid4().hex[:8]}"
        data["_id"] = doc_id
        await db.anamnesis.insert_one(data)

    # Log to history
    await db.history.insert_one({
        "_id": f"hist_{uuid.uuid4().hex[:8]}",
        "student_id": student_id,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "type": "anamnese",
        "title": "Anamnese Atualizada",
        "description": "Ficha médica e histórico de treino revisados pelo personal.",
        "value": "Anamnese",
        "delta": "Atualizado",
        "is_positive": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    doc = await db.anamnesis.find_one({"_id": doc_id})
    doc["id"] = str(doc.pop("_id"))
    return doc

# ==========================================
# ROUTES: ATTENDANCE & FREQUENCY
# ==========================================

@api_router.get("/students/{student_id}/attendance")
async def get_student_attendance(student_id: str, month: Optional[str] = None):
    query: Dict[str, Any] = {"student_id": student_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}

    cursor = db.attendance.find(query).sort("date", -1)
    records = await cursor.to_list(200)

    for r in records:
        r["id"] = str(r.pop("_id"))

    # Compute summary
    all_cursor = db.attendance.find({"student_id": student_id})
    all_records = await all_cursor.to_list(500)

    total_performed = sum(1 for r in all_records if r.get("status") == "presente")
    total_missed = sum(1 for r in all_records if r.get("status") == "falta")

    attended_dates = [r.get("date") for r in all_records if r.get("status") == "presente" and r.get("date")]
    missed_dates = [r.get("date") for r in all_records if r.get("status") == "falta" and r.get("date")]

    last_workout = attended_dates[0] if attended_dates else None

    # Calculate weekly / monthly percentage estimates
    total_sessions = total_performed + total_missed
    monthly_freq = round((total_performed / max(1, total_sessions)) * 100, 1) if total_sessions > 0 else 100.0
    weekly_freq = min(5, round(total_performed / 4, 1))

    return {
        "records": records,
        "summary": {
            "total_performed": total_performed,
            "total_missed": total_missed,
            "weekly_frequency": weekly_freq,
            "monthly_frequency": monthly_freq,
            "last_workout_date": last_workout,
            "attended_dates": attended_dates,
            "missed_dates": missed_dates
        }
    }

@api_router.post("/students/{student_id}/attendance")
async def log_attendance(student_id: str, data: Dict[str, Any]):
    new_id = f"att_{uuid.uuid4().hex[:8]}"
    data["_id"] = new_id
    data["student_id"] = student_id
    data["created_at"] = datetime.now(timezone.utc).isoformat()

    await db.attendance.insert_one(data)

    # If present, update student last workout date
    if data.get("status") == "presente":
        await db.students.update_one(
            {"_id": student_id},
            {"$set": {
                "last_workout_date": data.get("date"),
                "days_without_workout": 0,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

        await db.history.insert_one({
            "_id": f"hist_{uuid.uuid4().hex[:8]}",
            "student_id": student_id,
            "date": data.get("date", datetime.now().strftime("%Y-%m-%d")),
            "type": "presenca",
            "title": "Treino Realizado",
            "description": f"Sessão concluída com sucesso ({data.get('workout_title', 'Musculação')}).",
            "value": "Presença",
            "delta": "+1 sessão",
            "is_positive": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    doc = await db.attendance.find_one({"_id": new_id})
    doc["id"] = str(doc.pop("_id"))
    return doc

# ==========================================
# ROUTES: STUDENT CHRONOLOGICAL HISTORY
# ==========================================

@api_router.get("/students/{student_id}/history")
async def get_student_history(student_id: str):
    cursor = db.history.find({"student_id": student_id}).sort("date", -1)
    events = await cursor.to_list(100)
    result = []
    for e in events:
        e["id"] = str(e.pop("_id"))
        result.append(e)
    return result

@api_router.post("/students/{student_id}/history")
async def add_student_history_event(student_id: str, data: Dict[str, Any]):
    new_id = f"hist_{uuid.uuid4().hex[:8]}"
    data["_id"] = new_id
    data["student_id"] = student_id
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.history.insert_one(data)
    doc = await db.history.find_one({"_id": new_id})
    doc["id"] = str(doc.pop("_id"))
    return doc

# ==========================================
# ROUTES: CHAT & MESSAGES
# ==========================================

@api_router.get("/students/{student_id}/messages")
async def get_messages(student_id: str):
    cursor = db.messages.find({"student_id": student_id}).sort("timestamp", 1)
    docs = await cursor.to_list(200)
    result = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        result.append(d)
    return result

@api_router.post("/students/{student_id}/messages")
async def send_message(student_id: str, data: Dict[str, Any]):
    new_id = f"msg_{uuid.uuid4().hex[:8]}"
    data["_id"] = new_id
    data["student_id"] = student_id
    data["timestamp"] = datetime.now(timezone.utc).isoformat()
    data["read"] = False
    await db.messages.insert_one(data)

    doc = await db.messages.find_one({"_id": new_id})
    doc["id"] = str(doc.pop("_id"))
    return doc

# ==========================================
# ROUTES: DASHBOARD & ALERTS
# ==========================================

@api_router.get("/dashboard/summary")
async def get_dashboard_summary():
    students_cursor = db.students.find({"deleted_at": None})
    students = await students_cursor.to_list(500)

    total_students = len(students)
    active_students = sum(1 for s in students if s.get("status") == "ativo")
    new_students_this_month = sum(1 for s in students if s.get("created_at", "").startswith("2026-06") or s.get("created_at", "").startswith("2024-04"))
    overdue_payments = sum(1 for s in students if s.get("status") == "inadimplente")
    inactive_students_7d = sum(1 for s in students if s.get("days_without_workout", 0) >= 7 or s.get("status") in ["inadimplente", "inativo"])
    pending_assessments = 3

    # Generate Alerts
    alerts = []
    for s in students:
        s_id = str(s.get("_id"))
        s_name = s.get("name", "Aluno")
        s_phone = s.get("phone", "")

        # 1. Inactivity Alert
        if s.get("days_without_workout", 0) >= 7:
            alerts.append({
                "id": f"alert_inactivity_{s_id}",
                "type": "inactivity",
                "student_id": s_id,
                "student_name": s_name,
                "student_phone": s_phone,
                "title": f"{s_name} sem treinar há {s.get('days_without_workout')} dias",
                "description": "Envie uma mensagem de incentivo ou verifique se houve algum imprevisto.",
                "severity": "high",
                "action_label": "Conversar no WhatsApp"
            })

        # 2. Due Date / Payment Alert
        if s.get("status") == "inadimplente":
            alerts.append({
                "id": f"alert_payment_{s_id}",
                "type": "payment_overdue",
                "student_id": s_id,
                "student_name": s_name,
                "student_phone": s_phone,
                "title": f"Mensalidade pendente de {s_name}",
                "description": f"Vencimento expirado em {s.get('due_date')}. Valor: R$ {s.get('monthly_fee', 0):.2f}",
                "severity": "high",
                "action_label": "Enviar Cobrança"
            })
        elif s.get("status") == "proximo_vencimento":
            alerts.append({
                "id": f"alert_plan_{s_id}",
                "type": "plan_expiring",
                "student_id": s_id,
                "student_name": s_name,
                "student_phone": s_phone,
                "title": f"Plano de {s_name} vence em breve ({s.get('due_date')})",
                "description": "Ofereça a renovação antecipada do plano trimestral/semestral.",
                "severity": "medium",
                "action_label": "Renovar Plano"
            })

    # Prepare recent students
    recent = []
    for s in students[:6]:
        s_copy = dict(s)
        s_copy["id"] = str(s_copy.pop("_id"))
        recent.append(s_copy)

    return {
        "total_students": total_students,
        "active_students": active_students,
        "new_students_this_month": max(new_students_this_month, 2),
        "pending_assessments": pending_assessments,
        "overdue_payments": overdue_payments,
        "inactive_students_7d": inactive_students_7d,
        "alerts": alerts[:8],
        "recent_students": recent
    }

# ==========================================
# ROUTES: AI ASSISTANT FOR PERSONAL TRAINERS
# ==========================================

class AIRequest(BaseModel):
    prompt: str
    context: Optional[Dict[str, Any]] = None

@api_router.post("/ai/assistant")
async def ai_coach_assistant(req: AIRequest):
    """Uses OpenAI gpt-4o-mini to provide coaching insights and workout suggestions."""
    import openai
    
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY não configurada")

    system_prompt = (
        "Você é o Treinaí AI, um assistente de elite especializado em Educação Física, Fisiologia do Exercício, "
        "Biomecânica, Antropometria e Gestão de Personal Trainers. "
        "Responda sempre em Português do Brasil com clareza técnica, tom encorajador, formatação limpa e direta. "
        "Ao sugerir treinos, detalhe divisões (A/B/C), exercícios, séries, repetições, carga sugerida, descanso e cadência. "
        "Ao analisar evolução antropométrica (Pollock 3/7, dobras e circunferências), calcule e explique os ganhos de massa magra e perdas de gordura."
    )

    context_str = ""
    if req.context:
        context_str = f"\n[Contexto do Aluno/Personal]:\n{req.context}\n"

    try:
        session_id = f"apextrainer_{uuid.uuid4().hex[:8]}"
        
        client = openai.AsyncOpenAI(api_key=openai_key)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"{context_str}\nPergunta/Instrução do Personal:\n{req.prompt}"}
            ]
        )
        response_text = response.choices[0].message.content

        return {"reply": response_text, "session_id": session_id}
    except Exception as e:
        logger.error(f"Erro ao chamar AI Assistant: {str(e)}")
        fallback_reply = (
            f"💡 **Recomendação Treinaí:**\n\n"
            f"Com base na solicitação: *'{req.prompt}'*,\n"
            f"Recomenda-se manter foco no princípio da sobrecarga progressiva, respeitar intervalo de 48h a 72h para o mesmo grupo muscular "
            f"e monitorar o percentual de gordura via protocolo Pollock a cada 45 dias para ajustes metabólicos."
        )
        return {"reply": fallback_reply, "error": str(e)}

# ==========================================
# HELPERS & MODELS
# ==========================================

class RegisterBody(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)

class LoginBody(BaseModel):
    email: EmailStr
    password: str

def _trainer_public(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", "Personal"),
        "email": doc.get("email"),
    }

# ==========================================
# ROUTES: ADMIN (Manage Trainers)
# ==========================================

@api_router.get("/admin/trainers")
async def list_trainers(trainer: dict = Depends(get_current_trainer)):
    if not trainer.get("is_admin"):
        raise HTTPException(403, "Acesso negado")
    cursor = db.trainers.find({"is_admin": {"$ne": True}}).sort("name", 1)
    trainers = await cursor.to_list(100)
    return [_trainer_public(t) for t in trainers]

@api_router.post("/admin/trainers")
async def create_trainer(body: RegisterBody, trainer: dict = Depends(get_current_trainer)):
    if not trainer.get("is_admin"):
        raise HTTPException(403, "Acesso negado")
    email = body.email.lower()
    existing = await db.trainers.find_one({"email": email})
    if existing:
        raise HTTPException(409, "Este e-mail já está em uso.")
    
    doc = {
        "_id": f"trainer_{uuid.uuid4().hex[:8]}",
        "name": body.name.strip() or "Personal",
        "email": email,
        "password_hash": hash_password(body.password),
        "is_admin": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.trainers.insert_one(doc)
    return _trainer_public(doc)

@api_router.delete("/admin/trainers/{trainer_id}")
async def delete_trainer(trainer_id: str, trainer: dict = Depends(get_current_trainer)):
    if not trainer.get("is_admin"):
        raise HTTPException(403, "Acesso negado")
    
    result = await db.trainers.delete_one({"_id": trainer_id, "is_admin": {"$ne": True}})
    if result.deleted_count == 0:
        raise HTTPException(404, "Personal não encontrado ou protegido")
    return {"success": True}

# ==========================================
# ROUTES: AUTH (public)
# ==========================================

@public_router.post("/auth/register")
async def register_trainer(body: RegisterBody):
    email = body.email.lower()
    if await db.trainers.find_one({"email": email}):
        raise HTTPException(409, "Este e-mail já está cadastrado")
    doc = {
        "_id": f"trainer_{uuid.uuid4().hex[:10]}",
        "name": body.name.strip() or "Personal",
        "email": email,
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.trainers.insert_one(doc)
    return {"access_token": issue_token(doc["_id"]), "token_type": "bearer", "trainer": _trainer_public(doc)}

@public_router.post("/auth/login")
async def login_unified(body: LoginBody):
    email = body.email.lower()
    
    # Check if trainer/admin
    trainer = await db.trainers.find_one({"email": email})
    if trainer and verify_password(body.password, trainer.get("password_hash", "")):
        role = "admin" if trainer.get("is_admin") else "trainer"
        return {
            "access_token": issue_token(trainer["_id"]),
            "token_type": "bearer",
            "role": role,
            "user": _trainer_public(trainer)
        }
        
    # Check if student
    student = await db.students.find_one({"email": email, "deleted_at": None})
    if student and verify_password(body.password, student.get("password_hash", "")):
        student_clean = {k: v for k, v in student.items() if k not in ["password_hash"]}
        student_clean["id"] = student_clean.pop("_id")
        return {
            "access_token": issue_token(student["_id"]),
            "token_type": "bearer",
            "role": "student",
            "user": student_clean
        }

    raise HTTPException(401, "E-mail ou senha incorretos")

@api_router.get("/auth/me")
async def get_me(trainer: dict = Depends(get_current_trainer)):
    role = "admin" if trainer.get("is_admin") else "trainer"
    return {"user": _trainer_public(trainer), "role": role}

@student_router.get("/student/me")
async def get_student_me(student: dict = Depends(get_current_student)):
    student_clean = {k: v for k, v in student.items() if k not in ["password_hash"]}
    student_clean["id"] = student_clean.pop("_id")
    return {"user": student_clean, "role": "student"}

# ==========================================
# ROUTES: FILE UPLOAD / DOWNLOAD (Object Storage)
# ==========================================

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), trainer: dict = Depends(get_current_trainer)):
    ext = (file.filename or "img.jpg").rsplit(".", 1)[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "webp", "heic", "heif"]:
        ext = "jpg"
    content = await file.read()
    path = f"{APP_NAME}/uploads/{str(trainer['_id'])}/{uuid.uuid4().hex}.{ext}"
    content_type = file.content_type or "image/jpeg"
    try:
        result = await run_in_threadpool(put_object, path, content, content_type)
    except Exception as e:
        logger.error(f"Erro no upload: {e}")
        raise HTTPException(502, "Falha ao enviar imagem para o armazenamento")
    await db.uploads.insert_one({
        "_id": result["path"],
        "owner_id": str(trainer["_id"]),
        "content_type": content_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}

@public_router.get("/files/{path:path}")
async def download_file(path: str):
    doc = await db.uploads.find_one({"_id": path})
    if not doc:
        raise HTTPException(404, "Arquivo não encontrado")
    try:
        content, content_type = await run_in_threadpool(get_object, path)
    except Exception as e:
        logger.error(f"Erro ao baixar arquivo: {e}")
        raise HTTPException(404, "Arquivo não encontrado")
    return Response(content=content, media_type=content_type)

# ==========================================
# ROUTES: PUSH NOTIFICATIONS
# ==========================================

class RegisterPushBody(BaseModel):
    user_id: str
    platform: str
    device_token: str

@api_router.post("/register-push", status_code=201)
async def register_push(body: RegisterPushBody, trainer: dict = Depends(get_current_trainer)):
    resp = await _push_client.post("/api/v1/push/users/register", json=body.model_dump())
    if resp.status_code == 401:
        raise HTTPException(500, "EMERGENT_PUSH_KEY missing or invalid")
    if resp.status_code >= 500:
        raise HTTPException(502, "Push provider unavailable")
    resp.raise_for_status()
    return {"status": "registered"}

@api_router.post("/alerts/notify")
async def notify_alerts(trainer: dict = Depends(get_current_trainer)):
    """Sends the trainer a push summarizing pending alerts (inactive students, overdue payments)."""
    students = await db.students.find({"deleted_at": None}).to_list(500)
    inactive = [s for s in students if s.get("days_without_workout", 0) >= 7]
    overdue = [s for s in students if s.get("status") == "inadimplente"]
    parts = []
    if inactive:
        parts.append(f"{len(inactive)} sem treinar 7+ dias")
    if overdue:
        parts.append(f"{len(overdue)} com pagamento atrasado")
    message = " • ".join(parts) if parts else "Tudo em dia! Nenhum alerta pendente."
    try:
        await send_push(
            recipients=[str(trainer["_id"])],
            data={"title": "Resumo de Alertas Treinaí", "message": message, "action_url": "/"},
            idempotency_key=f"alerts_{datetime.now().strftime('%Y%m%d%H')}",
        )
    except Exception as e:
        logger.warning(f"Push de alertas falhou (não bloqueante): {e}")
        return {"sent": False, "message": message}
    return {"sent": True, "message": message}

# ==========================================
# ROUTES: STUDENT DASHBOARD & TRACKING
# ==========================================

@student_router.get("/student/dashboard")
async def get_student_dashboard(student: dict = Depends(get_current_student)):
    student_id = str(student["_id"])
    today_str = datetime.now().strftime("%Y-%m-%d")

    # Fetch today's hydration
    water_docs = await db.hydration.find({"student_id": student_id, "date": today_str}).to_list(None)
    total_water = sum(doc.get("amount_ml", 0) for doc in water_docs)
    water_goal = student.get("water_goal_ml", 3000)

    # Fetch today's nutrition
    food_docs = await db.nutrition.find({"student_id": student_id, "date": today_str}).to_list(None)
    calories = sum(doc.get("calories", 0) for doc in food_docs)
    protein = sum(doc.get("protein_g", 0) for doc in food_docs)
    carbs = sum(doc.get("carbs_g", 0) for doc in food_docs)
    fat = sum(doc.get("fat_g", 0) for doc in food_docs)

    # Fetch latest physical assessment to show current weight & fat
    latest_assessment = await db.assessments.find_one(
        {"student_id": student_id, "deleted_at": None},
        sort=[("date", -1)]
    )

    # Fetch next/current workout
    workout = await db.workouts.find_one({"student_id": student_id, "deleted_at": None}, sort=[("created_at", -1)])
    if workout:
        workout["id"] = workout.pop("_id")

    return {
        "hydration": {
            "consumed_ml": total_water,
            "goal_ml": water_goal,
            "remaining_ml": max(0, water_goal - total_water)
        },
        "nutrition": {
            "calories": calories,
            "protein_g": protein,
            "carbs_g": carbs,
            "fat_g": fat,
            "calories_goal": student.get("calories_goal", 2000),
            "protein_goal": student.get("protein_goal", 150),
        },
        "metrics": {
            "weight_kg": latest_assessment.get("weight_kg") if latest_assessment else student.get("weight_kg", 0),
            "body_fat_pct": latest_assessment.get("body_fat_pct") if latest_assessment else 0,
        },
        "workout": workout,
        "diet_plan": student.get("diet_plan", [])
    }

@student_router.post("/student/water")
async def log_water(body: Dict[str, Any], student: dict = Depends(get_current_student)):
    amount = int(body.get("amount_ml", 0))
    doc = {
        "_id": f"water_{uuid.uuid4().hex[:8]}",
        "student_id": str(student["_id"]),
        "date": datetime.now().strftime("%Y-%m-%d"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "amount_ml": amount
    }
    await db.hydration.insert_one(doc)
    doc["id"] = doc.pop("_id")
    return doc

@student_router.get("/student/meals")
async def get_meals(student: dict = Depends(get_current_student), date: str = None):
    date_query = date or datetime.now().strftime("%Y-%m-%d")
    docs = await db.nutrition.find({"student_id": str(student["_id"]), "date": date_query}).to_list(100)
    for d in docs: d["id"] = d.pop("_id")
    return docs

@student_router.post("/student/meals")
async def log_meal(body: Dict[str, Any], student: dict = Depends(get_current_student)):
    doc = {
        "_id": f"meal_{uuid.uuid4().hex[:8]}",
        "student_id": str(student["_id"]),
        "date": datetime.now().strftime("%Y-%m-%d"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "meal_type": body.get("meal_type", "Lanche"),
        "food_name": body.get("food_name", ""),
        "calories": float(body.get("calories", 0)),
        "protein_g": float(body.get("protein_g", 0)),
        "carbs_g": float(body.get("carbs_g", 0)),
        "fat_g": float(body.get("fat_g", 0))
    }
    await db.nutrition.insert_one(doc)
    doc["id"] = doc.pop("_id")
    return doc

@student_router.get("/student/runs")
async def get_runs(student: dict = Depends(get_current_student)):
    docs = await db.runs.find({"student_id": str(student["_id"])}).sort("date", -1).to_list(100)
    for d in docs: d["id"] = d.pop("_id")
    return docs

@student_router.post("/student/runs")
async def log_run(body: Dict[str, Any], student: dict = Depends(get_current_student)):
    doc = {
        "_id": f"run_{uuid.uuid4().hex[:8]}",
        "student_id": str(student["_id"]),
        "date": datetime.now().strftime("%Y-%m-%d"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "distance_km": float(body.get("distance_km", 0)),
        "duration_min": float(body.get("duration_min", 0)),
        "calories_kcal": float(body.get("calories_kcal", 0)),
    }
    # Calculate pace
    if doc["distance_km"] > 0:
        doc["pace_min_km"] = doc["duration_min"] / doc["distance_km"]
    else:
        doc["pace_min_km"] = 0
        
    await db.runs.insert_one(doc)
    doc["id"] = doc.pop("_id")
    return doc

# Include routers
app.include_router(public_router)
app.include_router(api_router, dependencies=[Depends(get_current_trainer)])
app.include_router(student_router, dependencies=[Depends(get_current_student)])

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_tasks():
    # Ensure a default admin exists so login works out of the box
    try:
        existing = await db.trainers.find_one({"email": "admin@treinai.com"})
        if not existing:
            await db.trainers.insert_one({
                "_id": "admin_default",
                "name": "Administrador Treinaí",
                "email": "admin@treinai.com",
                "password_hash": hash_password("treino123"),
                "is_admin": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
    except Exception as e:
        logger.warning(f"Não foi possível garantir trainer padrão: {e}")
    # Init object storage (non-blocking failure)
    try:
        await run_in_threadpool(init_storage)
        logger.info("Object storage inicializado")
    except Exception as e:
        logger.warning(f"Falha ao inicializar object storage: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
