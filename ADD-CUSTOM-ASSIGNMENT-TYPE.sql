-- =====================================================
-- FIX: Add 'custom' to assignment_type constraint
-- =====================================================
-- Error: violates check constraint "assignments_assignment_type_check"
-- Solution: Update constraint to allow 'room', 'game', AND 'custom'

-- Step 1: Remove old constraint
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_assignment_type_check;

-- Step 2: Add updated constraint (allows 'room', 'game', 'custom')
ALTER TABLE assignments ADD CONSTRAINT assignments_assignment_type_check 
CHECK (assignment_type IN ('room', 'game', 'custom'));

-- Step 3: Verify the constraint was added
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'assignments'::regclass
AND conname = 'assignments_assignment_type_check';

-- Expected output:
-- constraint_name: assignments_assignment_type_check
-- constraint_definition: CHECK ((assignment_type = ANY (ARRAY['room'::text, 'game'::text, 'custom'::text])))

-- Test: Try inserting a custom assignment (will rollback, just testing)
DO $$
BEGIN
    -- This is just a test, will rollback
    INSERT INTO assignments (
        teacher_id,
        title,
        description,
        assignment_type,
        status,
        due_date
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', -- dummy UUID
        'Test Custom Assignment',
        'Testing if custom type works',
        'custom', -- This should now work!
        'draft',
        NOW() + INTERVAL '7 days'
    );
    
    RAISE NOTICE '✅ Custom assignment type is now allowed!';
    
    -- Rollback the test insert
    RAISE EXCEPTION 'Rolling back test insert';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test complete - changes rolled back';
END $$;
