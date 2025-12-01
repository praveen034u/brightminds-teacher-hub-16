# Global Grade Filter - Cross-Page Filtering System

## Overview
Implemented a **global grade filter context** that persists across all pages in the application. When teachers select grades on the dashboard, the filter automatically applies to Assignments, Rooms, and Question Papers pages - providing a seamless, consistent filtering experience throughout the application.

---

## ✨ Key Features

### 1. **Persistent Grade Selection**
- Select grades once on the dashboard
- Filter persists when navigating to other pages
- No need to reselect filters on each page
- Maintains user preference throughout the session

### 2. **Global Context Implementation**
- React Context API for state management
- Centralized grade selection state
- Accessible from any component/page
- Type-safe with TypeScript

### 3. **Multi-Page Filtering**
- **Dashboard**: Filter rooms and assignments
- **Assignments Page**: Filter by selected grades
- **Rooms Page**: Filter by selected grades
- **Question Papers Page**: Filter by selected grades

### 4. **Automatic Synchronization**
- Changes on dashboard instantly reflect on all pages
- No manual refresh needed
- Real-time filter updates across navigation

---

## 🏗️ Architecture

### Context Structure:

```typescript
interface GradeFilterContextType {
  selectedGrades: string[];           // Array of selected grade levels
  setSelectedGrades: (grades: string[]) => void;
  availableGrades: string[];          // All available grades
  setAvailableGrades: (grades: string[]) => void;
  toggleGrade: (grade: string) => void;  // Add/remove grade
  clearAllGrades: () => void;          // Clear selection
  isGradeSelected: (grade: string) => boolean;  // Check if selected
}
```

### File Structure:

```
src/
├── contexts/
│   └── GradeFilterContext.tsx    ← Context provider & hooks
├── App.tsx                        ← Wraps app with provider
└── pages/
    ├── TeacherHome.tsx           ← Dashboard with filter UI
    ├── AssignmentsPage.tsx       ← Applies grade filter
    ├── RoomsPage.tsx             ← Applies grade filter
    └── QuestionPapersPage.tsx    ← Applies grade filter
```

---

## 🔧 Implementation Details

### Step 1: Context Provider (GradeFilterContext.tsx)

```typescript
export const GradeFilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);

  const toggleGrade = (grade: string) => {
    if (selectedGrades.includes(grade)) {
      setSelectedGrades(prev => prev.filter(g => g !== grade));
    } else {
      setSelectedGrades(prev => [...prev, grade]);
    }
  };

  const clearAllGrades = () => {
    setSelectedGrades([]);
  };

  const isGradeSelected = (grade: string) => {
    return selectedGrades.includes(grade);
  };

  return (
    <GradeFilterContext.Provider
      value={{
        selectedGrades,
        setSelectedGrades,
        availableGrades,
        setAvailableGrades,
        toggleGrade,
        clearAllGrades,
        isGradeSelected,
      }}
    >
      {children}
    </GradeFilterContext.Provider>
  );
};

export const useGradeFilter = () => {
  const context = useContext(GradeFilterContext);
  if (context === undefined) {
    throw new Error('useGradeFilter must be used within a GradeFilterProvider');
  }
  return context;
};
```

### Step 2: Wrap App with Provider (App.tsx)

```typescript
import { GradeFilterProvider } from '@/contexts/GradeFilterContext';

const App = () => (
  <Auth0Provider>
    <AuthProvider>
      <GradeFilterProvider>  {/* ← Global filter wrapper */}
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              {/* All routes */}
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </GradeFilterProvider>
    </AuthProvider>
  </Auth0Provider>
);
```

### Step 3: Dashboard Filter UI (TeacherHome.tsx)

```typescript
import { useGradeFilter } from '@/contexts/GradeFilterContext';

const TeacherHome = () => {
  const { 
    selectedGrades, 
    availableGrades, 
    setAvailableGrades, 
    toggleGrade, 
    clearAllGrades, 
    isGradeSelected 
  } = useGradeFilter();

  // Extract available grades from data
  useEffect(() => {
    const gradesSet = new Set<string>();
    
    // From teacher profile
    user?.grades_taught?.forEach((grade: string) => {
      if (grade) gradesSet.add(grade);
    });
    
    // From rooms
    rooms.forEach((room) => {
      if (room.grade_level) gradesSet.add(room.grade_level);
    });
    
    // From assignments
    assignments.forEach((assignment) => {
      if (assignment.grade) gradesSet.add(assignment.grade);
    });
    
    setAvailableGrades(Array.from(gradesSet).sort());
  }, [rooms, assignments]);

  // Filter UI with context functions
  return (
    <div>
      <button onClick={clearAllGrades}>All Grades</button>
      {availableGrades.map((grade) => (
        <button 
          key={grade}
          onClick={() => toggleGrade(grade)}
          className={isGradeSelected(grade) ? 'selected' : ''}
        >
          {isGradeSelected(grade) && <CheckCircle2 />}
          Grade {grade}
        </button>
      ))}
      {selectedGrades.length > 0 && (
        <button onClick={clearAllGrades}>
          Clear All ({selectedGrades.length})
        </button>
      )}
    </div>
  );
};
```

### Step 4: Apply Filter on Pages

#### Assignments Page:
```typescript
import { useGradeFilter } from '@/contexts/GradeFilterContext';

function AssignmentsPage() {
  const { selectedGrades } = useGradeFilter();
  const [assignments, setAssignments] = useState([]);

  // Filter assignments by both room and grade
  const filteredAssignments = useMemo(() => {
    let filtered = assignments;
    
    // Filter by room (existing filter)
    if (selectedRoomFilter !== 'all') {
      filtered = filtered.filter((a) => a.room_id === selectedRoomFilter);
    }
    
    // Filter by selected grades (NEW)
    if (selectedGrades.length > 0) {
      filtered = filtered.filter((a) => selectedGrades.includes(a.grade));
    }
    
    return filtered;
  }, [assignments, selectedRoomFilter, selectedGrades]);

  return (
    <div>
      {filteredAssignments.map((assignment) => (
        <AssignmentCard key={assignment.id} {...assignment} />
      ))}
    </div>
  );
}
```

#### Rooms Page:
```typescript
import { useGradeFilter } from '@/contexts/GradeFilterContext';

export const RoomsPage = () => {
  const { selectedGrades } = useGradeFilter();
  const [rooms, setRooms] = useState([]);

  // Filter rooms by selected grades
  const filteredRooms = useMemo(() => {
    if (selectedGrades.length === 0) {
      return rooms;
    }
    return rooms.filter((room) => selectedGrades.includes(room.grade_level));
  }, [rooms, selectedGrades]);

  return (
    <div>
      {filteredRooms.map((room) => (
        <RoomCard key={room.id} {...room} />
      ))}
    </div>
  );
};
```

#### Question Papers Page:
```typescript
import { useGradeFilter } from '@/contexts/GradeFilterContext';

export const QuestionPapersPage = () => {
  const { selectedGrades } = useGradeFilter();
  const [questionPapers, setQuestionPapers] = useState([]);

  // Filter question papers by selected grades
  const filteredQuestionPapers = useMemo(() => {
    if (selectedGrades.length === 0) {
      return questionPapers;
    }
    return questionPapers.filter((paper) => selectedGrades.includes(paper.grade));
  }, [questionPapers, selectedGrades]);

  return (
    <div>
      {filteredQuestionPapers.map((paper) => (
        <QuestionPaperCard key={paper.id} {...paper} />
      ))}
    </div>
  );
};
```

---

## 🎯 User Experience Flow

### Scenario 1: Teacher Managing Grade 5 Only

```
1. Teacher opens Dashboard
2. Clicks "Grade 5" filter button
3. Dashboard shows only Grade 5 rooms & assignments
4. Teacher navigates to /assignments
   → Automatically shows only Grade 5 assignments
5. Teacher navigates to /rooms
   → Automatically shows only Grade 5 rooms
6. Teacher navigates to /question-papers
   → Automatically shows only Grade 5 papers
```

**No need to reselect filter on each page!**

### Scenario 2: Teacher Managing Multiple Grades

```
1. Teacher on Dashboard
2. Selects "Grade 5", "Grade 6", "Grade 7"
3. Dashboard shows combined data from all 3 grades
4. Navigates to /assignments
   → Shows assignments from all 3 grades
5. Navigates to /rooms
   → Shows rooms from all 3 grades
6. Clicks "Clear All" on dashboard
7. All pages now show all grades again
```

**Filter state syncs across all pages instantly!**

### Scenario 3: Using Combined Filters

```
Assignments Page has TWO filters:
1. Room Filter (local to assignments page)
2. Grade Filter (global from context)

Example:
- Select "Grade 5" + "Grade 6" (global filter)
- Select "Room A" (local filter)
- Result: Shows only assignments from Room A 
          that are for Grade 5 or Grade 6
```

**Both filters work together!**

---

## 💡 Technical Benefits

### 1. **Performance Optimization**
- `useMemo` for efficient filtering
- Only re-filters when dependencies change
- No unnecessary re-renders

### 2. **Type Safety**
- Full TypeScript support
- Type-checked context values
- Compile-time error catching

### 3. **Maintainability**
- Single source of truth for grade state
- Easy to add new pages with filtering
- Centralized logic

### 4. **Scalability**
- Easy to extend with new filter types
- Can add subject filter, status filter, etc.
- Pattern can be reused for other global state

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│            GradeFilterProvider (App.tsx)            │
│                                                     │
│  State: selectedGrades: ["5", "6"]                 │
│         availableGrades: ["5", "6", "7", "8"]      │
└─────────────────────────────────────────────────────┘
                        │
                        │ Context provides state to all children
                        │
        ┌───────────────┼───────────────┬───────────────┐
        │               │               │               │
        ▼               ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Dashboard   │ │ Assignments  │ │    Rooms     │ │   Question   │
│    Page      │ │     Page     │ │     Page     │ │  Papers Page │
│              │ │              │ │              │ │              │
│ • Shows UI   │ │ • Reads      │ │ • Reads      │ │ • Reads      │
│ • Manages    │ │   selected   │ │   selected   │ │   selected   │
│   selection  │ │   Grades     │ │   Grades     │ │   Grades     │
│ • Updates    │ │ • Filters    │ │ • Filters    │ │ • Filters    │
│   context    │ │   data       │ │   data       │ │   data       │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
        │
        │ User selects "Grade 5"
        │
        └─────────────────────────────────────────────┐
                                                      │
                                            Updates context
                                                      │
                                                      ▼
                              All pages re-filter automatically
```

---

## 🧪 Testing Scenarios

### Test 1: Single Grade Selection
1. Go to Dashboard
2. Click "Grade 5"
3. Verify dashboard shows only Grade 5 data
4. Navigate to /assignments
5. **Expected**: Only Grade 5 assignments visible
6. Navigate to /rooms
7. **Expected**: Only Grade 5 rooms visible
8. Navigate to /question-papers
9. **Expected**: Only Grade 5 papers visible

### Test 2: Multiple Grade Selection
1. Go to Dashboard
2. Select "Grade 5" and "Grade 7"
3. Verify dashboard shows combined data
4. Navigate between pages
5. **Expected**: All pages show Grade 5 + 7 data

### Test 3: Clear Filter
1. Select some grades
2. Click "Clear All"
3. **Expected**: All pages show all data

### Test 4: No Grades Available
1. Teacher with no grades assigned
2. **Expected**: No filter UI shown, all data visible

### Test 5: Mixed Filters
1. Select "Grade 5" (global)
2. Go to assignments page
3. Select a specific room (local filter)
4. **Expected**: Only Grade 5 assignments from that room

---

## 🚀 Future Enhancements

### Possible Extensions:

1. **Subject Filter**
   - Add `selectedSubjects` to context
   - Filter by both grade AND subject
   - Example: "Grade 5 Math"

2. **Status Filter**
   - Add `selectedStatuses` to context
   - Filter by active/completed/archived
   - Example: "Grade 5 Active Assignments"

3. **Date Range Filter**
   - Add `dateRange` to context
   - Filter by creation/due date
   - Example: "Grade 5 assignments due this week"

4. **Student Group Filter**
   - Add `selectedGroups` to context
   - Filter by advanced/standard/remedial
   - Example: "Grade 5 Advanced Track"

5. **Save Filter Presets**
   - Store favorite filter combinations
   - Quick-apply saved filters
   - Example: "Morning Classes" preset

6. **URL Query Parameters**
   - Persist filter in URL
   - Share filtered views via link
   - Example: `/assignments?grades=5,6&status=active`

---

## 📊 Impact & Benefits

### For Teachers:
✅ **Time Saved** - Set filter once, applies everywhere  
✅ **Less Confusion** - Consistent view across pages  
✅ **Better Organization** - Focus on specific grades  
✅ **Seamless Navigation** - No filter context loss  
✅ **Intuitive UX** - Predictable behavior  

### For Development:
✅ **Clean Architecture** - Centralized state management  
✅ **Reusable Pattern** - Easy to add new filters  
✅ **Type Safety** - TypeScript prevents bugs  
✅ **Performance** - Efficient memoized filtering  
✅ **Maintainable** - Single source of truth  

---

## 🎓 Summary

### What We Built:
✅ Global grade filter context  
✅ Persistent filter state across pages  
✅ Multi-select grade filtering  
✅ Applied to 4 pages (Dashboard, Assignments, Rooms, Question Papers)  
✅ Seamless user experience  
✅ Type-safe implementation  

### How It Works:
1. **Context** stores selected grades globally
2. **Dashboard** provides UI to select/clear grades
3. **All pages** read from context and filter data
4. **Navigation** preserves filter selection
5. **Changes** sync instantly across pages

### Key Achievement:
Teachers can now filter their entire workspace by grade with a single selection, and the filter persists everywhere they navigate. This creates a **cohesive, intuitive experience** that matches their mental model of managing different grade levels! 🎯✨
