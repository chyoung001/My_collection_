-- Database: my_collection_backenddb (schema init)

CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  subject        VARCHAR(255) NOT NULL,
  year           VARCHAR(4)   NOT NULL,
  set_name       VARCHAR(255) NOT NULL,
  card_number    VARCHAR(50)  NOT NULL,
  variety        VARCHAR(255),
  category       VARCHAR(255),
  grade          VARCHAR(50),
  grader         VARCHAR(20),
  cert_number    VARCHAR(50),
  image_url      TEXT,

  -- PSA external data (raw)
  certification_type VARCHAR(20),
  is_hologram        VARCHAR(10),
  is_reverse_barcode VARCHAR(10),
  psa_cert           JSONB,
  psa_population     JSONB,
  psa_images         JSONB,
  dna_cert           JSONB,

  current_price  NUMERIC(12,2),

  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_cert_number ON cards (cert_number);
CREATE INDEX IF NOT EXISTS idx_cards_subject ON cards (subject);
CREATE INDEX IF NOT EXISTS idx_cards_grader_grade ON cards (grader, grade);


ALTER TABLE cards ADD COLUMN IF NOT EXISTS certification_type VARCHAR(20);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_hologram VARCHAR(10);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_reverse_barcode VARCHAR(10);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS psa_cert JSONB;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS psa_population JSONB;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS psa_images JSONB;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS dna_cert JSONB;

-- market price snapshot history
CREATE TABLE IF NOT EXISTS market_snapshots (
  id           SERIAL PRIMARY KEY,
  card_id      INTEGER REFERENCES cards(id) ON DELETE CASCADE,
  query        TEXT NOT NULL,
  ebay_count   INTEGER,
  avg_price    NUMERIC(12,2),
  min_price    NUMERIC(12,2),
  max_price    NUMERIC(12,2),
  median_price NUMERIC(12,2),
  items        JSONB,
  fetched_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_card_id_fetched ON market_snapshots (card_id, fetched_at DESC);
