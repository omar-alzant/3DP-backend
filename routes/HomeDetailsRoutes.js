const express = require('express');
const supabase = require('../config/supabase');
const router = express.Router();
const logger = require("../config/logger"); // import the logger
const authMiddleware = require('../middleware/auth');
const loggerSupa = require("../config/loggerSupabase");



router.get('/', authMiddleware, async (req, res) => {
  
    const { data, error } = await supabase
      .from('Home')
      .select('*');
      const userId = req.id;
      if (error) {
      loggerSupa(`Home.Error`, error.message, userId);    
      return res.status(400).json({ error: error.message });
    }
    loggerSupa(`Home.Info`, 'Get all Home done.', userId);  
    res.json(data);
  });
  
  
  router.post('/', authMiddleware, async (req, res) => {
    const { Title, Image, Detail, Display  } = req.body;
    const userId = req.id;

    // console.log({ name, basePrice, description,  color, isNew, materialType, pricePerCm3  });
    const created_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('Home')
      .insert([{ Title, Image, Detail, Display, created_at }]);
  
    if (error) {
      loggerSupa(`Home.Error`, error.message, userId);  
      return res.status(400).json({ error: error.message });
    }
    loggerSupa(`Home.Info`, 'Insert Home document.', userId);  
    res.status(201).json(data);
  });
  
// Edit material
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { Title, Image, Detail, Display } = req.body;
  const userId = req.id;

  const { data, error } = await supabase
    .from('Home')
    .update({ 
      Title, Image, Detail, Display
    })
    .eq('id', id)   // 👈 Make sure to update the correct row
    .select();      // return the updated row(s)

  if (error) {
    loggerSupa(`Home.Error`, error.message, userId);  
    return res.status(400).json({ error: error.message });
  }
  loggerSupa(`Home.Info`, `Update Home for: ${Title} done. `, userId);  
  res.status(200).json(data);
});

// DELETE material
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.id;

  const { error } = await supabase
    .from('Home')
    .delete()
    .eq('id', id);

  if (error) {
    loggerSupa(`Home.Error`, error.message, userId);    
    return res.status(400).json({ error: error.message });
  }

  loggerSupa(`Home.Info`, `Home deleted for id: ${id}`, userId);    
  res.json({ message: 'Home deleted' });
});

  module.exports = router;
