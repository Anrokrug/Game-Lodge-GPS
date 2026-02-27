DROP TABLE IF EXISTS property_config CASCADE;
DROP TABLE IF EXISTS schema_version CASCADE;

CREATE TABLE schema_version (
  key TEXT PRIMARY KEY,
  val INTEGER DEFAULT 0
);

CREATE TABLE property_config (
  id INTEGER PRIMARY KEY,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  default_zoom INTEGER DEFAULT 16,
  property_name TEXT DEFAULT 'Zebula Golf Estate & Spa'
);

INSERT INTO property_config (id, lat, lng, default_zoom, property_name)
VALUES (1, NULL, NULL, 16, 'Zebula Golf Estate & Spa');

INSERT INTO schema_version (key, val) VALUES ('config_v4', 1);
