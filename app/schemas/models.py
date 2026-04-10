from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class Severity(str, Enum):
    ok = "OK"
    warning = "WARNING"
    critical = "CRITICAL"


class InterfaceMetricIn(BaseModel):
    name: str = Field(..., examples=["enp1s0"])
    rx_bytes: int = Field(..., ge=0)
    tx_bytes: int = Field(..., ge=0)
    rx_dropped: int = Field(0, ge=0)
    tx_dropped: int = Field(0, ge=0)
    speed: Optional[int] = Field(default=None, ge=0, description="Mbps")


class MetricsIn(BaseModel):
    hostname: str
    ip_address: Optional[str] = None
    cpu: float = Field(..., ge=0, le=100)
    memory: float = Field(..., ge=0, le=100)
    disk: float = Field(..., ge=0, le=100)
    load_avg: Optional[float] = Field(default=None, ge=0)
    latency: Optional[float] = Field(default=None, ge=0)
    packet_loss: Optional[float] = Field(default=None, ge=0, le=100)
    jitter: Optional[float] = Field(default=None, ge=0)
    interfaces: List[InterfaceMetricIn] = Field(default_factory=list)


class Server(BaseModel):
    id: int
    hostname: str
    ip_address: Optional[str] = None
    created_at: datetime


class Metric(BaseModel):
    id: int
    server_id: int
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    load_avg: Optional[float] = None
    timestamp: datetime


class NetworkMetric(BaseModel):
    id: int
    server_id: int
    latency: Optional[float] = None
    packet_loss: Optional[float] = None
    jitter: Optional[float] = None
    timestamp: datetime


class InterfaceMetric(BaseModel):
    id: int
    server_id: int
    interface_name: str
    rx_bytes: int
    tx_bytes: int
    rx_dropped: int
    tx_dropped: int
    speed: Optional[int]
    timestamp: datetime


class Alert(BaseModel):
    id: int
    server_id: int
    type: str
    severity: Severity
    message: str
    created_at: datetime


class MetricsIngestResponse(BaseModel):
    status: str = "ok"
    server_id: int
    alerts: List[Alert] = Field(default_factory=list)
