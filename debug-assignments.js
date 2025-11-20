// Debug script to check assignments and room assignments
// Run this in browser console on the assignments page

async function debugAssignments() {
  console.log('🔍 DEBUGGING ASSIGNMENT AND ROOM DATA...');
  
  // Get the auth0 user ID from the page
  const auth0UserId = window.localStorage.getItem('auth0UserId') || 'auth0|691cd8a9ddd38628d96d4339';
  
  try {
    // Fetch all assignments
    const response = await fetch(`https://lfsmtsnakdaukxgrqynk.supabase.co/functions/v1/assignments?auth0_user_id=${encodeURIComponent(auth0UserId)}`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxmc210c25ha2RhdWt4Z3JxeW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1MzE2MTksImV4cCI6MjA0NzEwNzYxOX0.YosVWZxg2yoCYGoe6YbZDSSeJCL6AGgx3_OgLz4zpXU'
      }
    });
    
    const assignments = await response.json();
    
    console.log('📋 ALL ASSIGNMENTS:');
    assignments.forEach((assignment, index) => {
      console.log(`${index + 1}. "${assignment.title}"`);
      console.log(`   - ID: ${assignment.id}`);
      console.log(`   - Type: ${assignment.assignment_type}`);
      console.log(`   - Room ID: ${assignment.room_id || 'NULL (available to all students)'}`);
      console.log(`   - Game ID: ${assignment.game_id || 'N/A'}`);
      console.log(`   - Created: ${assignment.created_at}`);
      
      if (assignment.room_id) {
        console.log(`   - 🏠 RESTRICTED to room: ${assignment.room_id}`);
      } else {
        console.log(`   - 🌐 AVAILABLE to all students (no room restriction)`);
      }
      console.log('');
    });
    
    // Check for the "Both are assigned" assignment specifically
    const bothAssignedAssignment = assignments.find(a => a.title === 'Both are assigned');
    if (bothAssignedAssignment) {
      console.log('🔴 FOUND PROBLEMATIC ASSIGNMENT: "Both are assigned"');
      console.log('   - Room ID:', bothAssignedAssignment.room_id);
      if (bothAssignedAssignment.room_id === null) {
        console.log('   - 🚨 ISSUE: Assignment has NO room restriction - this is why both students see it!');
      } else {
        console.log(`   - Assignment IS restricted to room: ${bothAssignedAssignment.room_id}`);
        console.log('   - If both students see it, they must both be in this room');
      }
    }
    
    // Fetch rooms to see room memberships
    const roomsResponse = await fetch(`https://lfsmtsnakdaukxgrqynk.supabase.co/functions/v1/rooms?auth0_user_id=${encodeURIComponent(auth0UserId)}`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxmc210c25ha2RhdWt4Z3JxeW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1MzE2MTksImV4cCI6MjA0NzEwNzYxOX0.YosVWZxg2yoCYGoe6YbZDSSeJCL6AGgx3_OgLz4zpXU'
      }
    });
    
    const rooms = await roomsResponse.json();
    
    console.log('🏠 ALL ROOMS AND THEIR STUDENTS:');
    rooms.forEach((room, index) => {
      console.log(`${index + 1}. "${room.name}" (ID: ${room.id})`);
      console.log(`   - Students: ${room.student_count || 0}`);
      if (room.students) {
        room.students.forEach(student => {
          console.log(`     • ${student.name} (${student.email})`);
        });
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugAssignments();