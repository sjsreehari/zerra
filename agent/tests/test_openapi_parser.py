"""Tests for OpenAPI & GraphQL dynamic schema parser and contract fuzzing engine."""

import json
import pytest

from agent.pentest import (
    PentestScanConfig,
    ScanMode,
    generate_contract_fuzz_probes,
    parse_graphql_introspection,
    parse_openapi_spec,
)
from agent.pentest.orchestrator import PentestOrchestrator


SAMPLE_OPENAPI_SPEC = {
    "openapi": "3.0.0",
    "info": {
        "title": "Corporate Invoicing API",
        "version": "2.1.0"
    },
    "servers": [{"url": "http://api.internal.net"}],
    "paths": {
        "/invoices/{invoice_id}": {
            "get": {
                "summary": "Retrieve an invoice record",
                "operationId": "getInvoice",
                "parameters": [
                    {
                        "name": "invoice_id",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "string"},
                        "description": "Unique identifier of the invoice"
                    },
                    {
                        "name": "include_details",
                        "in": "query",
                        "required": False,
                        "schema": {"type": "boolean"}
                    }
                ],
                "responses": {"200": {"description": "Invoice found"}}
            }
        },
        "/admin/export": {
            "post": {
                "summary": "Export system database",
                "operationId": "exportDb",
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {"format": {"type": "string", "enum": ["csv", "json"]}}
                            }
                        }
                    }
                },
                "responses": {"200": {"description": "Export status"}}
            }
        }
    }
}


def test_parse_openapi_spec_success():
    """Verify OpenAPI 3.x schema extraction."""
    parsed = parse_openapi_spec(SAMPLE_OPENAPI_SPEC)
    assert parsed.title == "Corporate Invoicing API"
    assert parsed.version == "2.1.0"
    assert len(parsed.endpoints) == 2

    # Check /invoices/{invoice_id} endpoint
    inv_ep = next(e for e in parsed.endpoints if "{invoice_id}" in e.path)
    assert inv_ep.method == "GET"
    assert len(inv_ep.parameters) == 2

    path_param = next(p for p in inv_ep.parameters if p.in_type == "path")
    assert path_param.name == "invoice_id"
    assert path_param.required is True


def test_generate_contract_fuzz_probes():
    """Verify dynamic probe generation with BOLA mutations and injection vectors."""
    parsed = parse_openapi_spec(SAMPLE_OPENAPI_SPEC)
    inv_ep = next(e for e in parsed.endpoints if "{invoice_id}" in e.path)

    probes = generate_contract_fuzz_probes(inv_ep)
    assert len(probes) >= 4

    test_types = [p["test_type"] for p in probes]
    assert "baseline" in test_types
    assert "bola_mutation" in test_types
    assert "injection_probe" in test_types

    # Ensure BOLA probes mutate the path
    bola_probes = [p for p in probes if p["test_type"] == "bola_mutation"]
    assert any("inv-001" in p["path"] for p in bola_probes)
    assert any("inv-002" in p["path"] for p in bola_probes)


def test_parse_graphql_introspection():
    """Verify GraphQL introspection schema parsing."""
    sample_gql = {
        "data": {
            "__schema": {
                "queryType": {"name": "Query"},
                "mutationType": {"name": "Mutation"},
                "types": [
                    {
                        "name": "Query",
                        "fields": [
                            {"name": "user", "args": [{"name": "id", "type": {"name": "ID"}}]},
                            {"name": "allInvoices", "args": []}
                        ]
                    },
                    {
                        "name": "Mutation",
                        "fields": [
                            {"name": "deleteInvoice", "args": [{"name": "id", "type": {"name": "ID"}}]}
                        ]
                    }
                ]
            }
        }
    }

    endpoints = parse_graphql_introspection(sample_gql)
    assert len(endpoints) == 3
    op_ids = [e.operation_id for e in endpoints]
    assert "graphql_user" in op_ids
    assert "graphql_allInvoices" in op_ids
    assert "graphql_deleteInvoice" in op_ids


def test_orchestrator_openapi_ingestion():
    """Verify orchestrator parses spec and generates coverage records."""
    config = PentestScanConfig(
        target_url="http://127.0.0.1:8000",
        mode=ScanMode.QUICK,
        openapi_spec=json.dumps(SAMPLE_OPENAPI_SPEC),
        enabled_skills=["api_bola_idor"],
    )

    orchestrator = PentestOrchestrator(config)
    assert orchestrator.config.openapi_spec is not None

    spec = parse_openapi_spec(orchestrator.config.openapi_spec)
    assert len(spec.endpoints) == 2
