UPDATE rooms
SET amenities = NULLIF(
    TRIM(BOTH ' ' FROM TRIM(BOTH ',' FROM TRIM(BOTH ' ' FROM
        REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(CONCAT(', ', COALESCE(amenities, ''), ', '), ', Full nội thất, ', ', '),
                    ', full nội thất, ',
                    ', '
                ),
                ', Cửa sổ lớn, ',
                ', '
            ),
            ', cửa sổ lớn, ',
            ', '
        )
    ))),
    ''
)
WHERE amenities LIKE '%Full nội thất%'
   OR amenities LIKE '%full nội thất%'
   OR amenities LIKE '%Cửa sổ lớn%'
   OR amenities LIKE '%cửa sổ lớn%';

UPDATE rooms
SET furniture_type = 'Đầy đủ'
WHERE furniture_type = 'Full nội thất';
