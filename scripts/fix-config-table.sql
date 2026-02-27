-- Drop and recreate property_config with TEXT column instead of JSONB
-- This fixes the type mismatch that was causing 500 errors on POST

DROP TABLE IF EXISTS property_config;

CREATE TABLE property_config (
  id INTEGER PRIMARY KEY,
  reception_point TEXT,
  default_zoom INTEGER DEFAULT 16,
  property_name TEXT DEFAULT 'Zebula Golf Estate & Spa'
);

INSERT INTO property_config (id, reception_point, default_zoom, property_name)
VALUES (1, NULL, 16, 'Zebula Golf Estate & Spa');
