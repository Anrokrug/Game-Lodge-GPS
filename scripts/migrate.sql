-- Zebula Golf Estate & Spa — Property Navigator DB
-- Run once to set up the database

CREATE TABLE IF NOT EXISTS houses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  path JSONB NOT NULL DEFAULT '[]',
  reception_point JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_config (
  id INT PRIMARY KEY DEFAULT 1,
  reception_point JSONB,
  default_zoom INT NOT NULL DEFAULT 16,
  property_name TEXT NOT NULL DEFAULT 'Zebula Golf Estate & Spa',
  CHECK (id = 1)
);

-- Insert default config row if not exists
INSERT INTO property_config (id, property_name)
VALUES (1, 'Zebula Golf Estate & Spa')
ON CONFLICT (id) DO NOTHING;
