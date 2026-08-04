ALTER TABLE contratos ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'geração de contratos';

UPDATE contratos
SET status = COALESCE(status, 'geração de contratos')
WHERE status IS NULL OR status = '';

ALTER TABLE parcelas ALTER COLUMN status_pagamento TYPE varchar(30);
