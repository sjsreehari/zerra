package container

import (
	"context"
	"database/sql"
	"encoding/json"
)

type Repository interface {
	SaveInstance(ctx context.Context, i *Instance) error
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) SaveInstance(ctx context.Context, i *Instance) error {
	cmdJSON, err := json.Marshal(i.Command)
	if err != nil {
		return err
	}

	query := `
		INSERT INTO 
			instances 
				(
					image, 
					command, 
					output, 
					status, 
					created_at, 
					updated_at
				)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err = r.db.ExecContext(
		ctx,
		query,
		i.Image,
		cmdJSON,
		i.Output,
		i.Status,
		i.CreatedAt,
		i.UpdatedAt,
	)
	return err
}
