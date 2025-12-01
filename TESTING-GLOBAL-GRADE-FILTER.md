# Testing Guide: Global Grade Filter

## ✅ Quick Test Steps

### Test 1: Basic Single Grade Filter
1. Open **http://localhost:8082/dashboard**
2. Look for the grade filter bar below the welcome message
3. Click on **"Grade 5"** (or any available grade)
4. **Verify Dashboard**: 
   - ✅ Only Grade 5 rooms should appear
   - ✅ Only Grade 5 assignments should appear
   - ✅ Button should turn purple with checkmark
5. Navigate to **http://localhost:8082/assignments**
6. **Verify Assignments Page**:
   - ✅ Only Grade 5 assignments should be visible
   - ✅ No filter reselection needed
7. Navigate to **http://localhost:8082/rooms**
8. **Verify Rooms Page**:
   - ✅ Only Grade 5 rooms should be visible
9. Navigate to **http://localhost:8082/question-papers**
10. **Verify Question Papers Page**:
    - ✅ Only Grade 5 question papers should be visible

### Test 2: Multiple Grade Selection
1. Go back to **Dashboard**
2. Click **"Grade 6"** (while Grade 5 still selected)
3. **Verify Dashboard**:
   - ✅ Both Grade 5 and Grade 6 data visible
   - ✅ Both buttons purple with checkmarks
4. Navigate to **Assignments Page**
5. **Verify**: Shows assignments from both Grade 5 AND Grade 6
6. Navigate to **Rooms Page**
7. **Verify**: Shows rooms from both grades
8. Navigate to **Question Papers Page**
9. **Verify**: Shows papers from both grades

### Test 3: Clear Filter
1. Go to **Dashboard**
2. Click **"Clear All (2)"** button (red button showing count)
3. **Verify Dashboard**:
   - ✅ All rooms appear
   - ✅ All assignments appear
   - ✅ "All Grades" button is active (purple)
4. Navigate through all pages
5. **Verify**: All pages show complete unfiltered data

### Test 4: Toggle Grade On/Off
1. Select **Grade 5** and **Grade 7**
2. **Verify**: Both are purple with checkmarks
3. Click **Grade 5** again (to unselect it)
4. **Verify**: 
   - ✅ Grade 5 button turns white (unselected)
   - ✅ Only Grade 7 data shown
   - ✅ Filter persists across page navigation

### Test 5: All Grades Button
1. Select some grades
2. Click **"All Grades"** button
3. **Verify**:
   - ✅ All individual grade buttons turn white
   - ✅ All data appears
   - ✅ Same as clicking "Clear All"

### Test 6: Filter Persistence During Navigation
1. Dashboard → Select **Grade 6**
2. Navigate to **Assignments** → Should see only Grade 6
3. Navigate to **Rooms** → Should see only Grade 6
4. Navigate back to **Dashboard** → Grade 6 still selected
5. Navigate to **Question Papers** → Should see only Grade 6
6. **Verify**: Filter never resets during navigation

### Test 7: Combined Filters (Assignments Page)
1. Dashboard → Select **Grade 5** and **Grade 6**
2. Navigate to **Assignments Page**
3. Use the **Room Filter** dropdown → Select a specific room
4. **Verify**:
   - ✅ Shows only assignments from selected room
   - ✅ AND only from Grade 5 or Grade 6
   - ✅ Both filters work together

---

## 🐛 Known Behaviors

### Expected Behavior:
- **Empty array** (no grades selected) = Show ALL data
- **Non-empty array** (grades selected) = Show ONLY selected grades (OR logic)
- Filter UI only shown if `availableGrades.length > 0`
- Filter persists across page refreshes (during same session)

### Visual States:
- **Unselected Grade**: White background, gray border, no icon
- **Selected Grade**: Purple gradient, white text, checkmark icon, ring effect
- **All Grades Active**: Purple gradient, "All" badge
- **Clear All Button**: Only appears when grades selected, shows count

---

## 📋 Checklist for Complete Test

- [ ] Dashboard shows grade filter UI
- [ ] Can select single grade
- [ ] Can select multiple grades
- [ ] Can toggle grades on/off
- [ ] "Clear All" button works
- [ ] "All Grades" button works
- [ ] Visual states correct (colors, icons, rings)
- [ ] Assignments page filters by selected grades
- [ ] Rooms page filters by selected grades
- [ ] Question Papers page filters by selected grades
- [ ] Filter persists when navigating between pages
- [ ] Filter persists when going back to dashboard
- [ ] Combined filters work (e.g., room + grade on assignments)
- [ ] No console errors
- [ ] Smooth animations on grade button clicks

---

## 🚀 Success Criteria

✅ **Persistence**: Grade selection maintained across all page navigation  
✅ **Consistency**: Same grades filtered on all pages  
✅ **Synchronization**: Changes on dashboard reflect everywhere instantly  
✅ **Intuitive UX**: No need to reselect filter on each page  
✅ **Visual Feedback**: Clear indication of selected grades  
✅ **Performance**: No lag or slowness when filtering  
✅ **Multi-Select**: Can select 0 to N grades  
✅ **Clear Action**: Easy way to reset filter  

---

## 🎯 What You Should See

### Dashboard with Grade 5 Selected:
```
Filter by Grade: [All Grades] [✓ Grade 5] [Grade 6] [Grade 7] [✗ Clear All (1)]
                              ↑ Purple with checkmark

Virtual Rooms: Only Grade 5 rooms
Assignment Tracker: Only Grade 5 assignments
```

### Assignments Page (after selecting Grade 5 on dashboard):
```
Assignments

[Room Filter: All Rooms ▼]

Assignment Cards: Only Grade 5 assignments
```

### Rooms Page:
```
Virtual Rooms

Room Cards: Only Grade 5 rooms
```

### Question Papers Page:
```
Question Papers

Paper Cards: Only Grade 5 papers
```

---

## 🎉 Test Complete!

If all tests pass, the global grade filter is working perfectly! 

Teachers can now:
- Set their grade preference once
- Navigate freely between pages
- Always see filtered data
- Easily change or clear the filter

This creates a **seamless, professional experience**! 🚀
