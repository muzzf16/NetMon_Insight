from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.schemas.models import (
    Alert,
    InterfaceMetric,
    MetricsIn,
    Metric,
    NetworkMetric,
    Server,
    Severity,
)


class InMemoryStore:
    def __init__(self) -> None:
        self._server_seq = 1
        self._metric_seq = 1
        self._network_metric_seq = 1
        self._interface_metric_seq = 1
        self._alert_seq = 1

        self.servers: Dict[int, Server] = {}
        self.servers_by_hostname: Dict[str, int] = {}
        self.metrics: Dict[int, List[Metric]] = defaultdict(list)
        self.network_metrics: Dict[int, List[NetworkMetric]] = defaultdict(list)
        self.interface_metrics: Dict[int, List[InterfaceMetric]] = defaultdict(list)
        self.alerts: List[Alert] = []

    def _next_server_id(self) -> int:
        value = self._server_seq
        self._server_seq += 1
        return value

    def _next_metric_id(self) -> int:
        value = self._metric_seq
        self._metric_seq += 1
        return value

    def _next_network_metric_id(self) -> int:
        value = self._network_metric_seq
        self._network_metric_seq += 1
        return value

    def _next_interface_metric_id(self) -> int:
        value = self._interface_metric_seq
        self._interface_metric_seq += 1
        return value

    def _next_alert_id(self) -> int:
        value = self._alert_seq
        self._alert_seq += 1
        return value

    def get_or_create_server(self, hostname: str, ip_address: Optional[str]) -> Server:
        existing_id = self.servers_by_hostname.get(hostname)
        if existing_id is not None:
            server = self.servers[existing_id]
            if ip_address and server.ip_address != ip_address:
                server = server.model_copy(update={"ip_address": ip_address})
                self.servers[existing_id] = server
            return server

        server_id = self._next_server_id()
        server = Server(
            id=server_id,
            hostname=hostname,
            ip_address=ip_address,
            created_at=datetime.now(tz=timezone.utc),
        )
        self.servers[server_id] = server
        self.servers_by_hostname[hostname] = server_id
        return server

    def ingest_metrics(self, payload: MetricsIn) -> tuple[int, list[Alert]]:
        now = datetime.now(tz=timezone.utc)
        server = self.get_or_create_server(payload.hostname, payload.ip_address)

        metric = Metric(
            id=self._next_metric_id(),
            server_id=server.id,
            cpu_usage=payload.cpu,
            memory_usage=payload.memory,
            disk_usage=payload.disk,
            load_avg=payload.load_avg,
            timestamp=now,
        )
        self.metrics[server.id].append(metric)

        net_metric = NetworkMetric(
            id=self._next_network_metric_id(),
            server_id=server.id,
            latency=payload.latency,
            packet_loss=payload.packet_loss,
            jitter=payload.jitter,
            timestamp=now,
        )
        self.network_metrics[server.id].append(net_metric)

        for iface in payload.interfaces:
            self.interface_metrics[server.id].append(
                InterfaceMetric(
                    id=self._next_interface_metric_id(),
                    server_id=server.id,
                    interface_name=iface.name,
                    rx_bytes=iface.rx_bytes,
                    tx_bytes=iface.tx_bytes,
                    rx_dropped=iface.rx_dropped,
                    tx_dropped=iface.tx_dropped,
                    speed=iface.speed,
                    timestamp=now,
                )
            )

        generated_alerts = self._evaluate_threshold_alerts(server.id, payload, now)
        self.alerts.extend(generated_alerts)

        return server.id, generated_alerts

    def _evaluate_threshold_alerts(
        self, server_id: int, payload: MetricsIn, now: datetime
    ) -> list[Alert]:
        generated_alerts: list[Alert] = []

        if payload.cpu >= 90:
            generated_alerts.append(
                Alert(
                    id=self._next_alert_id(),
                    server_id=server_id,
                    type="CPU",
                    severity=Severity.critical,
                    message=f"CPU usage high: {payload.cpu}%",
                    created_at=now,
                )
            )
        elif payload.cpu >= 75:
            generated_alerts.append(
                Alert(
                    id=self._next_alert_id(),
                    server_id=server_id,
                    type="CPU",
                    severity=Severity.warning,
                    message=f"CPU usage warning: {payload.cpu}%",
                    created_at=now,
                )
            )

        if payload.memory >= 90:
            generated_alerts.append(
                Alert(
                    id=self._next_alert_id(),
                    server_id=server_id,
                    type="MEMORY",
                    severity=Severity.critical,
                    message=f"Memory usage high: {payload.memory}%",
                    created_at=now,
                )
            )

        if payload.packet_loss is not None and payload.packet_loss >= 5:
            generated_alerts.append(
                Alert(
                    id=self._next_alert_id(),
                    server_id=server_id,
                    type="NETWORK",
                    severity=Severity.warning,
                    message=f"Packet loss warning: {payload.packet_loss}%",
                    created_at=now,
                )
            )

        return generated_alerts


store = InMemoryStore()
