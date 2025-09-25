const express = require('express');
const supabase = require('../config/supabase');
const router = express.Router();
const logger = require("../config/logger"); // import the logger
const authMiddleware = require('../middleware/auth');
const loggerSupa = require("../config/loggerSupabase");



router.get('/', async (req, res) => {
  
    const { data, error } = await supabase
      .from('Benefits')
      .select('*');
      if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  });
  
  
  router.post('/', authMiddleware, async (req, res) => {
    const { Title, Image, Details, Display  } = req.body;
    const userId = req.id;

    // console.log({ name, basePrice, description,  color, isNew, materialType, pricePerCm3  });
    const created_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('Benefits')
      .insert([{ Title, Image, Details, Display, created_at }]);
  
    if (error) {
      loggerSupa(`Benefits.Error`, error.message, userId);  
      return res.status(400).json({ error: error.message });
    }
    loggerSupa(`Benefits.Info`, 'Insert benefit document.', userId);  
    res.status(201).json(data);
  });
  
// Edit material
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { Title, Image, Details, display } = req.body;
  const userId = req.id;

  const { data, error } = await supabase
    .from('Benefits')
    .update({ 
      Title, Image, Details, display
    })
    .eq('id', id)   // 👈 Make sure to update the correct row
    .select();      // return the updated row(s)

  if (error) {
    loggerSupa(`Benefit.Error`, error.message, userId);  
    return res.status(400).json({ error: error.message });
  }
  loggerSupa(`Benefit.Info`, `Update benefit for: ${Title} done. `, userId);  
  res.status(200).json(data);
});

// DELETE material
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.id;

  const { error } = await supabase
    .from('Benefits')
    .delete()
    .eq('id', id);

  if (error) {
    loggerSupa(`Benefits.Error`, error.message, userId);    
    return res.status(400).json({ error: error.message });
  }

  loggerSupa(`Benefits.Info`, `Benefits deleted for id: ${id}`, userId);    
  res.json({ message: 'Benefits deleted' });
});

  module.exports = router;
