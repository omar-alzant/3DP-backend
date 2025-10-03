const express = require('express');
const supabase = require('../config/supabase');
const router = express.Router();
const logger = require("../config/logger"); // import the logger
const authMiddleware = require('../middleware/auth');
const loggerSupa = require("../config/loggerSupabase");



router.get('/',  async (req, res) => {
  
    const { data, error } = await supabase
      .from('Shop')
      .select('*');

      // const userId = req.id;
      // console.log(userId)
      if (error) {
      // loggerSupa(`Shop.Error`, error.message, userId);    
      return res.status(400).json({ error: error.message });
    }
    // loggerSupa(`Shop.Info`, 'Get all Shop done.', userId);  
    res.json(data);
  });
  
  
  router.post('/', authMiddleware, async (req, res) => {
    const { name, fileUrl, price, description, display  } = req.body;
    const userId = req.id;
    // console.log({ name, basePrice, description,  color, isNew, materialType, pricePerCm3  });
    const created_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('Shop')
      .insert([{ name, fileUrl, description, price, display, created_at }])
      .select();
  
    if (error) {
      loggerSupa(`Shop.Error`, error.message, userId);  
      return res.status(400).json({ error: error.message });
    }
    loggerSupa(`Shop.Info`, 'Insert Shop document.', userId);  

    console.log(data)
    res.status(201).json(data);
  });
  
// Edit material
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, fileUrl, description, price, display } = req.body;
  const userId = req.id;
  const updatedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('Shop')
    .update({ 
        name, fileUrl, description, price, display, updatedAt
    })
    .eq('id', id)   // 👈 Make sure to update the correct row
    .select();      // return the updated row(s)

  if (error) {
    loggerSupa(`Shop.Error`, error.message, userId);  
    return res.status(400).json({ error: error.message });
  }
  loggerSupa(`Shop.Info`, `Update Shop for: ${Title} done. `, userId);  
  res.status(200).json(data);
});

// DELETE material
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.id;

  const { error } = await supabase
    .from('Shop')
    .delete()
    .eq('id', id);

  if (error) {
    loggerSupa(`Shop.Error`, error.message, userId);    
    return res.status(400).json({ error: error.message });
  }

  loggerSupa(`Shop.Info`, `Shop deleted for id: ${id}`, userId);    
  res.json({ message: 'Shop deleted' });
});

  module.exports = router;
