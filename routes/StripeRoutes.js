require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);
const router = express.Router();
const fs = require("fs");
const path = require("path");

router.post('/create-payment-intent', async (req, res) => {
  try {
    const { id, amount } = req.body; // المبلغ بالـ cents (مثلاً 1000 = $10)
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd', // أو العملة المحلية المدعومة في بلدك
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.send({ clientSecret: paymentIntent.client_secret });
    clearUploadsFolder(id);
} catch (error) {
    console.error(error);
    res.status(400).send({ error: error.message });
  }
});

function clearUploadsFolder(id) {
    // ارجع خطوة واحدة من routes -> stl-backend
    const uploadDir = path.join(__dirname, "../uploads", id);
  
    fs.readdir(uploadDir, (err, files) => {
      if (err) {
        console.error("Error reading uploads folder:", err);
        return;
      }
      fs.rmdir(uploadDir, (err) => {
        if (err) console.error("Failed to remove folder:", err);
      });
    
    });
  }
  

module.exports = router;
