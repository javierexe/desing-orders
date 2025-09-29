-- Migration: Add storage_key column to order_receipts
-- This column will store the Supabase Storage path/key for each uploaded receipt

ALTER TABLE order_receipts ADD COLUMN storage_key VARCHAR(255);