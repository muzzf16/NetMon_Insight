from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_ingest_and_list_servers() -> None:
    payload = {
        "hostname": "server1",
        "ip_address": "10.10.10.2",
        "cpu": 91,
        "memory": 76,
        "disk": 40,
        "packet_loss": 6,
        "interfaces": [
            {
                "name": "enp1s0",
                "rx_bytes": 100,
                "tx_bytes": 200,
                "rx_dropped": 3,
                "tx_dropped": 1,
                "speed": 1000,
            }
        ],
    }

    ingest = client.post("/api/v1/metrics", json=payload)
    assert ingest.status_code == 200
    assert ingest.json()["server_id"] == 1
    assert len(ingest.json()["alerts"]) >= 2

    servers = client.get("/api/v1/servers")
    assert servers.status_code == 200
    assert servers.json()[0]["hostname"] == "server1"

    metrics = client.get("/api/v1/metrics/1")
    assert metrics.status_code == 200
    assert len(metrics.json()) == 1

    alerts = client.get("/api/v1/alerts")
    assert alerts.status_code == 200
    assert len(alerts.json()) >= 2
