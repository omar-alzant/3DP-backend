const express = require('express');
const supabase = require('../config/supabase');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const loggerSupa = require("../config/loggerSupabase");

// GET all materials
router.get('/', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('materials')
    .select('*');
    const userId = req.userId;

  if (error) {
    loggerSupa(`Material.Error`, error.message, userId);  
    return res.status(400).json({ error: error.message });
  }
  loggerSupa(`Material.Info`, 'Get all materials successuly!', userId);  
  res.json(data);
});

// ADD material
router.post('/', authMiddleware, async (req, res) => {
  const { name, basePrice, description,  color, isNew, materialType, pricePerCm3  } = req.body;
  // console.log({ name, basePrice, description,  color, isNew, materialType, pricePerCm3  });
  const userId = req.userId;

  const { data, error } = await supabase
    .from('materials')
    .insert([{ name, basePrice, description,  color, isNew, materialType, pricePerCm3 }]);

  if (error) {
    loggerSupa(`Material.Error`, error.message, userId);  
    return res.status(400).json({ error: error.message });
  }
  
  loggerSupa(`Material.Info`, 'Insert Data into materials table done.', userId);  
  res.status(201).json(data);
});

// Edit material
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, basePrice, description, color, isNew, materialType, pricePerCm3 } = req.body;
  const userId = req.userId;

  const { data, error } = await supabase
    .from('materials')
    .update({ 
      name, 
      basePrice, 
      description,  
      color, 
      isNew, 
      materialType, 
      pricePerCm3 
    })
    .eq('id', id)   // 👈 Make sure to update the correct row
    .select();      // return the updated row(s)

  if (error) {
    loggerSupa(`Material.Error`, error.message, userId);  
    return res.status(400).json({ error: error.message });
  }
  loggerSupa(`Material.Info`, `Update material for: ${name} done. `, userId);  
  res.status(200).json(data);
});

// DELETE material
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', id);

  if (error) {
    loggerSupa(`Material.Error`, error.message, userId);    
    return res.status(400).json({ error: error.message });
  }

  loggerSupa(`Material.Info`, `Material deleted for id: ${id}`, userId);    
  res.json({ message: 'Material deleted' });
});

module.exports = router;
