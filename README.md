# NetMon Insight

Starter backend implementation based on `prd_system_design_net_mon_insight.md`.

## What's included
- FastAPI starter API with base path `/api/v1`
- In-memory storage for servers, metrics, network metrics, interface metrics, and alerts
- Basic threshold alerting (`CPU`, `MEMORY`, `NETWORK`)
- API endpoints for ingesting metrics and querying server/alert data
- Basic tests using `pytest`

## Project structure
```text
app/
  api/routes.py
  core/storage.py
  schemas/models.py
  main.py
tests/
  test_api.py
```

## Quick start
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open docs:
- Swagger UI: http://127.0.0.1:8000/docs

## Example ingest request
```bash
curl -X POST http://127.0.0.1:8000/api/v1/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "hostname": "server1",
    "ip_address": "10.0.0.1",
    "cpu": 82,
    "memory": 74,
    "disk": 60,
    "packet_loss": 2,
    "interfaces": [
      {
        "name": "enp1s0",
        "rx_bytes": 120000,
        "tx_bytes": 84000,
        "rx_dropped": 0,
        "tx_dropped": 0,
        "speed": 1000
      }
    ]
  }'
```

## Run tests
```bash
pytest
```

## Notes
This is starter code for MVP and currently uses in-memory storage. Next step is integrating InfluxDB or PostgreSQL/TimescaleDB.
