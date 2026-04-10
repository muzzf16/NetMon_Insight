from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from app.core.storage import store
from app.schemas.models import Alert, MetricsIn, MetricsIngestResponse, Metric, Server

router = APIRouter(prefix="/api/v1", tags=["netmon"])


@router.post("/metrics", response_model=MetricsIngestResponse)
def ingest_metrics(payload: MetricsIn) -> MetricsIngestResponse:
    server_id, alerts = store.ingest_metrics(payload)
    return MetricsIngestResponse(server_id=server_id, alerts=alerts)


@router.get("/servers", response_model=list[Server])
def list_servers() -> list[Server]:
    return list(store.servers.values())


@router.get("/servers/{server_id}", response_model=Server)
def get_server(server_id: int) -> Server:
    server = store.servers.get(server_id)
    if server is None:
        raise HTTPException(status_code=404, detail="server not found")
    return server


@router.get("/metrics/{server_id}", response_model=list[Metric])
def get_historical_metrics(
    server_id: int,
    from_ts: datetime | None = Query(default=None, alias="from"),
    to_ts: datetime | None = Query(default=None, alias="to"),
) -> list[Metric]:
    metrics = store.metrics.get(server_id)
    if metrics is None:
        raise HTTPException(status_code=404, detail="server not found")

    filtered = []
    for metric in metrics:
        if from_ts and metric.timestamp < from_ts:
            continue
        if to_ts and metric.timestamp > to_ts:
            continue
        filtered.append(metric)
    return filtered


@router.get("/alerts", response_model=list[Alert])
def list_alerts() -> list[Alert]:
    return store.alerts
