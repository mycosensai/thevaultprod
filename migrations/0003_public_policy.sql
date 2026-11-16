-- Listing fee default from 0000 was $20. The published policy charges none.
-- SQLite cannot ALTER a column default, so new $20 inserts are rejected and
-- unpaid $20 rows are waived. Paid historical rows stay for accounting.
CREATE TRIGGER IF NOT EXISTS listing_fees_reject_flat_fee
BEFORE INSERT ON listing_fees
WHEN NEW.amount IN ('20', '20.00', '20.0')
BEGIN
  SELECT RAISE(ABORT, 'listing fee is not charged');
END;

UPDATE listing_fees
SET amount = '0.00', status = 'waived'
WHERE amount IN ('20', '20.00', '20.0') AND status != 'paid';

CREATE TABLE IF NOT EXISTS support_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id INTEGER,
  created_at INTEGER NOT NULL
);
