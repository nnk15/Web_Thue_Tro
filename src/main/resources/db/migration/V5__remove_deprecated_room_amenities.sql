UPDATE rooms
SET amenities = NULLIF(
    TRIM(BOTH ' ' FROM TRIM(BOTH ',' FROM TRIM(BOTH ' ' FROM
        REPLACE(
            REPLACE(CONCAT(', ', COALESCE(amenities, ''), ', '), ', Chỗ để xe, ', ', '),
            ', chỗ để xe, ',
            ', '
        )
    ))),
    ''
)
WHERE amenities LIKE '%Chỗ để xe%'
   OR amenities LIKE '%chỗ để xe%';

UPDATE rooms
SET amenities = NULLIF(
    TRIM(BOTH ' ' FROM TRIM(BOTH ',' FROM TRIM(BOTH ' ' FROM
        REPLACE(
            REPLACE(CONCAT(', ', COALESCE(amenities, ''), ', '), ', Máy giặt chung, ', ', '),
            ', máy giặt chung, ',
            ', '
        )
    ))),
    ''
)
WHERE amenities LIKE '%Máy giặt chung%'
   OR amenities LIKE '%máy giặt chung%';

UPDATE rooms
SET amenities = NULLIF(
    TRIM(BOTH ' ' FROM TRIM(BOTH ',' FROM TRIM(BOTH ' ' FROM
        REPLACE(
            REPLACE(CONCAT(', ', COALESCE(amenities, ''), ', '), ', Internet tốc độ cao, ', ', '),
            ', internet tốc độ cao, ',
            ', '
        )
    ))),
    ''
)
WHERE amenities LIKE '%Internet tốc độ cao%'
   OR amenities LIKE '%internet tốc độ cao%';

UPDATE rooms
SET amenities = NULLIF(
    TRIM(BOTH ' ' FROM TRIM(BOTH ',' FROM TRIM(BOTH ' ' FROM
        REPLACE(
            REPLACE(CONCAT(', ', COALESCE(amenities, ''), ', '), ', Giờ giấc tự do, ', ', '),
            ', giờ giấc tự do, ',
            ', '
        )
    ))),
    ''
)
WHERE amenities LIKE '%Giờ giấc tự do%'
   OR amenities LIKE '%giờ giấc tự do%';
