-- Check all grades in the system

-- Grades from Question Papers
SELECT 'Question Papers' as source, grade, COUNT(*) as count
FROM question_papers
WHERE grade IS NOT NULL
GROUP BY grade
ORDER BY grade;

-- Grades from Rooms
SELECT 'Rooms' as source, grade_level as grade, COUNT(*) as count
FROM rooms
WHERE grade_level IS NOT NULL
GROUP BY grade_level
ORDER BY grade_level;

-- Grades from Assignments
SELECT 'Assignments' as source, grade, COUNT(*) as count
FROM assignments
WHERE grade IS NOT NULL
GROUP BY grade
ORDER BY grade;

-- All unique grades combined
SELECT DISTINCT grade FROM (
  SELECT grade FROM question_papers WHERE grade IS NOT NULL
  UNION
  SELECT grade_level as grade FROM rooms WHERE grade_level IS NOT NULL
  UNION
  SELECT grade FROM assignments WHERE grade IS NOT NULL
) as all_grades
ORDER BY grade;
