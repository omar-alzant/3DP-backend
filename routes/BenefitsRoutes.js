const express = require('express');
const supabase = require('../config/supabase');
const router = express.Router();
const logger = require("../config/logger"); // import the logger
const authMiddleware = require('../middleware/auth');
const loggerSupa = require("../config/loggerSupabase");



router.get('/', authMiddleware, async (req, res) => {
  
    const { data, error } = await supabase
      .from('Benefits')
      .select('*');
    const userId = req.userId;
    if (error) {
      loggerSupa(`Benefits.Error`, error.message, userId);    
      return res.status(400).json({ error: error.message });
    }

    loggerSupa(`Benefits.Info`, 'Get all benefits done.', userId);  
    res.json(data);
  });
  
  
  router.post('/', authMiddleware, async (req, res) => {
    const { Title, Image, Details  } = req.body;
    const userId = req.userId;

    // console.log({ name, basePrice, description,  color, isNew, materialType, pricePerCm3  });
    const created_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('Benefits')
      .insert([{ Title, Image, Details, created_at }]);
  
    if (error) {
      loggerSupa(`Benefits.Error`, error.message, userId);  
      return res.status(400).json({ error: error.message });
    }
    loggerSupa(`Benefits.Info`, 'Insert benefit document.', userId);  
    res.status(201).json(data);
  });
  
  module.exports = router;
