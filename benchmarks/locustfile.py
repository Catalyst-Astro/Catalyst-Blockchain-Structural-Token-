from locust import HttpUser, task, between


class ARKEUser(HttpUser):
    wait_time = between(0, 0)

    @task(5)
    def ingest_telemetry(self):
        self.client.post("/api/v1/telemetry/ingest", json={"payload": {"v": 1}})

    @task(2)
    def decision(self):
        self.client.post(
            "/api/v1/decision",
            json={"contexto": "evaluar"},
        )
