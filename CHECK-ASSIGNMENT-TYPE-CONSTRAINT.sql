-- Check what values are allowed for assignment_type
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'assignments'::regclass
AND conname LIKE '%assignment_type%';

-- Alternative query to see the check constraint
SELECT 
    table_name,
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%assignment_type%';

-- See the actual table definition
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'assignments'
ORDER BY ordinal_position;
