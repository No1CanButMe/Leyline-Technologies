from sqlalchemy import Column, Integer, Float, String, create_engine, Boolean, DateTime
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
)
from pydantic import BaseModel, validator
from typing import List, Dict
import json
from datetime import datetime


class SettlementCreate(BaseModel):
    amount: float


class SettlementResponse(BaseModel):
    accepted: bool
    new_amount: float = None


class SettlementModel(BaseModel):
    id: int
    amount: float
    status: str
    counter_offered: bool

    class Config:
        orm_mode = True


class SettlementUpdate(BaseModel):
    amount: float
    last_seen: str

    @validator("last_seen")
    def validate_last_seen(cls, v):
        try:
            return datetime.strptime(v, "%Y-%m-%dT%H:%M:%S.%fZ")
        except ValueError:
            raise ValueError("last_seen must be a valid datetime string in ISO format")


Base = declarative_base()


class Settlement(Base):
    __tablename__ = "settlements"
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float)
    status = Column(String, default="pending")
    counter_offered = Column(Boolean, default=False)
    last_responded_at = Column(DateTime, default=None)


DATABASE_URL = "sqlite:///./settlement.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# WebSocket
from typing import List, Dict
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.general_listeners: List[WebSocket] = []

    async def connect_general(self, websocket: WebSocket):
        await websocket.accept()
        self.general_listeners.append(websocket)
        print("Connected general listener WebSocket")

    def disconnect_general(self, websocket: WebSocket):
        self.general_listeners.remove(websocket)
        print("Disconnected general listener WebSocket")

    async def broadcast_general(self, message: str):
        message = json.dumps(message)
        for connection in self.general_listeners:
            await connection.send_text(message)
        print(f"Broadcasting message to all general listeners: {message}")

    async def connect(self, websocket: WebSocket, settlement_id: int):
        await websocket.accept()
        if settlement_id not in self.active_connections:
            self.active_connections[settlement_id] = []
        self.active_connections[settlement_id].append(websocket)
        print(f"Connected WebSocket for settlement ID {settlement_id}")

    def disconnect(self, websocket: WebSocket, settlement_id: int):
        if settlement_id in self.active_connections:
            self.active_connections[settlement_id].remove(websocket)
            if not self.active_connections[settlement_id]:
                del self.active_connections[settlement_id]
            print(f"Disconnected WebSocket for settlement ID {settlement_id}")

    async def send_personal_message(self, message: str, settlement_id: int):
        message = json.dumps(message)
        if settlement_id in self.active_connections:
            for connection in self.active_connections[settlement_id]:
                await connection.send_text(message)
            print(f"Message sent to settlement ID {settlement_id}: {message}")


manager = ConnectionManager()

# FastAPI Endpoints

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


Base.metadata.create_all(bind=engine)


@app.websocket("/ws/general")
async def websocket_general(websocket: WebSocket):
    await manager.connect_general(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_general(websocket)


@app.websocket("/ws/{settlement_id}")
async def websocket_settlement(websocket: WebSocket, settlement_id: int):
    await manager.connect(websocket, settlement_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, settlement_id)


@app.post("/settlements/")
def create_settlement(settlement: SettlementCreate, db: Session = Depends(get_db)):
    new_settlement = Settlement(amount=settlement.amount)
    db.add(new_settlement)
    db.commit()
    return {
        "id": new_settlement.id,
        "amount": new_settlement.amount,
        "status": new_settlement.status,
    }


@app.post("/settlements/{settlement_id}/respond")
async def respond_to_settlement(
    settlement_id: int, response: SettlementResponse, db: Session = Depends(get_db)
):
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")

    # Check if the settlement has already been agreed upon
    if settlement.status == "agreed":
        raise HTTPException(
            status_code=403,
            detail="Settlement already agreed upon and cannot be modified",
        )

    settlement.amount = (
        response.new_amount if not response.accepted else settlement.amount
    )
    settlement.status = "agreed" if response.accepted else "disputed"
    settlement.counter_offered = not response.accepted
    settlement.last_responded_at = datetime.utcnow()

    db.commit()
    settlement_data = {
        "id": settlement.id,
        "amount": settlement.amount,
        "status": settlement.status,
        "counter_offered": settlement.counter_offered,
    }
    await manager.broadcast_general(settlement_data)
    return settlement_data


@app.get("/settlements/")
def read_settlements(db: Session = Depends(get_db)):
    settlements = db.query(Settlement).all()
    return [
        {
            "id": s.id,
            "amount": s.amount,
            "status": s.status,
            "counter_offered": s.counter_offered,
        }
        for s in settlements
    ]


@app.get("/settlements/{settlement_id}", response_model=SettlementModel)
def read_settlement(settlement_id: int, db: Session = Depends(get_db)):
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
    return settlement


@app.put("/settlements/{settlement_id}/")
async def update_settlement(
    settlement_id: int, update: SettlementUpdate, db: Session = Depends(get_db)
):
    db_settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not db_settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")

    if db_settlement.status == "agreed":
        raise HTTPException(
            status_code=403,
            detail="Cannot modify an agreed settlement. Please refresh to see the new status.",
        )

    if (
        db_settlement.last_responded_at
        and db_settlement.last_responded_at > update.last_seen
    ):
        raise HTTPException(
            status_code=409,
            detail="New responses have been made since you last fetched the data. Please refresh to see the new status.",
        )

    db_settlement.amount = update.amount
    db_settlement.counter_offered = False
    db_settlement.status = "pending"
    db.commit()

    data = {
        "id": db_settlement.id,
        "amount": db_settlement.amount,
        "status": db_settlement.status,
    }

    await manager.send_personal_message(data, db_settlement.id)

    return data
