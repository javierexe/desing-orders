-- Migration: Add order_receipts table
-- Run this against your database (psql or via your migration tool).

CREATE TABLE IF NOT EXISTS order_receipts (
    id serial PRIMARY KEY,
    order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    url varchar(255) NOT NULL,
    filename varchar(255),
    uploaded_at date NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_order_receipts_order_id ON order_receipts(order_id);
