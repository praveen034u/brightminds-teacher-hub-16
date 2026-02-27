const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// CORS middleware
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

router.get('/', async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const auth0UserId = req.query.auth0_user_id || 'mock-teacher-1';
    const roomId = req.query.id;
    const action = req.query.action;

    // Get teacher ID
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id')
      .eq('auth0_user_id', auth0UserId)
      .single();
    if (teacherError) throw teacherError;

    // ...additional logic for roomId/action as needed...

    res.json({ teacher });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
