package trafficlog

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"
)

type Repository struct{ DB *sql.DB }

func (r Repository) Create(ctx context.Context, subdomain, sourceIP, method, path string, size int64, event json.RawMessage) (string, error) {
	var id string
	err := r.DB.QueryRowContext(ctx, `INSERT INTO "log" (subdomain, source_ip, request_method, request_path, request_size_bytes, event_json) VALUES ($1, NULLIF($2, '')::inet, $3, $4, $5, $6) RETURNING id`, subdomain, sourceIP, method, path, size, event).Scan(&id)
	return id, err
}

func (r Repository) Complete(ctx context.Context, id string, output json.RawMessage, verdict string, upstreamStatus int, errText string) error {
	_, err := r.DB.ExecContext(ctx, `UPDATE "log" SET agent_output=$2, verdict=$3, upstream_status=$4, error_message=NULLIF($5, ''), status='evaluated', evaluated_at=$6 WHERE id=$1`, id, output, verdict, upstreamStatus, errText, time.Now().UTC())
	return err
}

func (r Repository) SetEvent(ctx context.Context, id string, event json.RawMessage) error {
	_, err := r.DB.ExecContext(ctx, `UPDATE "log" SET event_json=$2 WHERE id=$1`, id, event)
	return err
}
