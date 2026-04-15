import json
from narrative_memory.story_ledger import StoryLedger


def test_log_action(tmp_path):
    tmp_file = tmp_path / "ledger.jsonl"

    ledger = StoryLedger(str(tmp_file))
    ledger.log_action(
        "test",
        "accion de prueba",
        {
            "traceId": "TRACE-001",
            "reqId": "REQ-IDC-001",
            "ctrId": "CTR-IDC-001",
            "caseId": "ui-case-1",
            "vids": ["0xbbb", "0xaaa"],
            "zkRefs": ["ZK-IDC-001"],
            "status": "logged",
        },
    )
    with tmp_file.open("r", encoding="utf-8") as f:
        data = json.loads(f.readline())
    assert data["actor"] == "test"
    assert data["action"] == "accion de prueba"
    assert "timestamp" in data
    assert data["traceId"] == "TRACE-001"
    assert data["reqId"] == "REQ-IDC-001"
    assert data["ctrId"] == "CTR-IDC-001"
    assert data["caseId"] == "ui-case-1"
    assert data["status"] == "logged"
    assert data["vids"] == ["0xaaa", "0xbbb"]
    assert data["zkRefs"] == ["ZK-IDC-001"]

