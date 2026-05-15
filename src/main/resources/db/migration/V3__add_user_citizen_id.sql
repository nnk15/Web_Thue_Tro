ALTER TABLE users
    ADD COLUMN citizen_id VARCHAR(30) NULL AFTER phone;

UPDATE users
SET citizen_id = CONCAT('001', LPAD(id, 9, '0'))
WHERE citizen_id IS NULL OR citizen_id = '';

ALTER TABLE users
    MODIFY citizen_id VARCHAR(30) NOT NULL;

ALTER TABLE users
    ADD CONSTRAINT uq_users_citizen_id UNIQUE (citizen_id);
