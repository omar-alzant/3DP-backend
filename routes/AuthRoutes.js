const express = require('express');
const supabase = require('../config/supabase');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const logger = require("../config/logger"); // import the logger
const loggerSupa = require("../config/loggerSupabase"); // import the logger
const authMiddleware = require('../middleware/auth');

  router.post('/register',authMiddleware, async (req, res) => {
    const { email, password } = req.body;
    const userId = req.userId;

    try {
      const full_name = email.split('@')[0];
      // 2. Create user in Auth
      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email,
        password
      });
      const avatar = "";
      const createdAt = new Date().toISOString();
      
      if (authError) {
        logger.error(authError.message)
        loggerSupa('register.Error', authError.message, '', userId);
        return res.status(400).json({ error: authError.message });
      }
      // 3. Add extra data in "profiles" table
      const { error: insertError } = await supabase
      .from('profiles')
      .insert([{ id: authUser.user.id, full_name, email, avatar, created_at: createdAt, updated_at: createdAt }]);
      
      if (insertError) {
        logger.error(insertError.message)
        loggerSupa('register.Error', insertError.message, '', userId);
        return res.status(400).json({ error: insertError.message });
      }
      
      logger.info('User registered successfully');
      loggerSupa('register.Info', 'User registered successfully', '', userId);
      
      res.json({ message: 'User registered successfully', user: authUser.user });
    } catch (err) {
      logger.error(err.message)
      loggerSupa('register.Error', err.message, '', userId);
      res.status(500).json({ error: err.message });
    }
  });
  
  // Update Pwd
  router.post('/updatePwd', authMiddleware, async (req, res) => {
    const { email, password } = req.body;
    const userId = req.userId;

    try {
      // Login with Supabase Auth
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password
      });
  
      if (updateError) {
        logger.error(updateError.message)
        loggerSupa('updatePwd.Error', updateError.message, '', userId);
        return res.status(400).json({ error: updateError.message });
      }
      const { data: profile, error } = await supabase
      .from('profiles')
      .select('isAdmin')
      .eq('id', updateData.user.id)
      .single(); // 👈 ensures one row instead of array
      
      if (error) {
        logger.error(error.message)
        loggerSupa('updatePwd.Error', error.message, '', userId);
        return res.status(400).json({ error: error.message });
      }
      
    const token = jwt.sign(
      { 
        id: updateData.user.id, 
        email, 
        isAdmin: profile.isAdmin // 👈 actual boolean
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    logger.info('Login successful')
    
    loggerSupa('updatePwd.Info', 'Login successful', '', userId);
      res.json({ message: 'Login successful', token, user: updateData.user });
    } catch (err) {
      logger.error(err.message)
      loggerSupa('updatePwd.Error', err.message, '', userId);
      res.status(500).json({ error: err.message });
    }
  });
  
  // forgot Pwd
  router.post('/ForgotPwd', authMiddleware, async (req, res) => {
  const { email } = req.body;
  const userId = req.userId;

  try {
    // 1️⃣ Check if the email exists in profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id') // just select minimal data
      .eq('email', email.trim())
      .single(); // we expect one row
      
      
      if (profileError) {
        logger.error('ForgotPwd: Email Not Exist!')
        loggerSupa('forgotPwd.Error', 'Email Not Exist!', '', userId);
        return res.status(400).json({ error: 'Email Not Exist!' });
      }
      
      if (profileData === '') {
        logger.error('ForgotPwd: No user found with this email')
        loggerSupa('forgotPwd.Error', 'No user found with this email!', '', userId);
        return res.status(404).json({ error: 'No user found with this email' });
      }
      
      logger.info('ForgotPwd: Matched email');
      loggerSupa('forgotPwd.Info', 'Matched email!', '', userId);
      
      // 2️⃣ Email exists -> proceed with reset
      const { data: updateData, error: updateError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: 'https://3-dp-frontend.vercel.app/update-password' }
    );

    if (updateError) {
      logger.error(updateError.message);
      loggerSupa('forgotPwd.Error', updateError.message, '', userId);

      return res.status(400).json({ error: updateError.message });
    }

    logger.info('Reset email sent successfully');
    loggerSupa('forgotPwd.Info', 'Reset email sent successfully!', '', userId);
    res.json({ message: 'Reset email sent', user: updateData });
  } catch (err) {
    logger.error(err.message);
    loggerSupa('forgotPwd.Error', err.message, '', userId);
    
    res.status(500).json({ error: err.message });
  }
});
  
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
      // Login with Supabase Auth
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
  
      if (loginError) return res.status(400).json({ error: loginError.message });
      const { data: profile, error } = await supabase
      .from('profiles')
      .select('isAdmin')
      .eq('id', loginData.user.id)
      .single(); // 👈 ensures one row instead of array
    
    if (error) {
      loggerSupa('login.Error', error.message, '', userId);
      return res.status(400).json({ error: error.message });
    }

    const token = jwt.sign(
      { 
        id: loginData.user.id, 
        email, 
        isAdmin: profile.isAdmin // 👈 actual boolean
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    loggerSupa('login.Info', 'Login successful!', '', loginData.user.id);
      res.json({ message: 'Login successful', token, user: loginData.user });
    } catch (err) {
      loggerSupa('Login.Error', err.message, '');
      res.status(500).json({ error: err.message });
    }
  });
  
  
  router.post('/logout', async (req, res) => {
    try {
      const { email, token } = req.body;
      const userId =  jwt.decode(token)?.id;
      
      if (!email || !token) {
        logger.error("Email and token are required")
        loggerSupa('Logout.Error', 'Email and token are required', '', userId);
        
        return res.status(400).json({ error: 'Email and token are required' });
      }
      
      // Verify the JWT token
      let tokenEmail = "";

      try {
        tokenEmail = jwt.decode(token)?.email; // decode without verifying signature
      } catch (err) {
        loggerSupa('Logout.Error', 'Invalid token', '', userId);
        logger.error("Invalid token")
        
        return res.status(400).json({ error: 'Invalid token' });
      }
      
      // Check if the email in the token matches the email in request
      if (tokenEmail !== email) {
        loggerSupa('Logout.Error', 'Email does not match token', '', userId);
        logger.error("Email does not match token")
        
        return res.status(401).json({ error: 'Email does not match token' });
      }
      
      // Proceed to logout
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error(err.message)
        loggerSupa('Logout.Error', err.message, '', userId);
        return res.status(400).json({ error: error.message });
      }
      
      loggerSupa('Logout.Info', 'Logout successeful', '', userId);
      logger.info('Logout successful')
      res.json({ message: 'Logout successful' });
    } catch (err) {
      logger.error(err.message)
      loggerSupa('Logout.Error', err.message, '', userId);
      res.status(500).json({ error: err.message });
    }
  });
  
  router.post('/UploadedSTL', authMiddleware, async (req, res) => {
    const {cartItems, customer, token} = req.body; 
    const Email = jwt.decode(token)?.email
    const id = req.querjwt.decode(token)?.id;
    const userId = req.userId;

    try {  
      const createdAt = new Date().toISOString();
      const uploadingDir = path.join(__dirname, "../uploads", id);
      
      const { error: insertError } = await supabase
      .from('UploadedSTL')
      .insert([{  SenderName: customer.name, SenderPhone: customer.phone, SenderAddress: customer.address, OrderDetails: cartItems, created_at: createdAt, Email }]);
      
      if (insertError) {
        
        loggerSupa('UploadedSTL.Error', insertError.message, '', userId);
        logger.error(insertError.message);
        return res.status(400).json({ error: insertError.message })
      }
        else{
          fs.readdir(uploadingDir, (err, files) => {
            if (err) {
              logger.error("Error reading uploads folder", err)
              loggerSupa('UploadedSTL.Error', 'Error reading uploads folder', '', userId);
              return;
            }
            fs.rm(uploadingDir,{ recursive: true, force: true }, (err) => {
              if (err) {
                logger.error("Error removing uploads folder:", err);
                loggerSupa('UploadedSTL.Error', `Error removing uploads folder: ${err}`, '', userId);
              } else {
                logger.info("Uploads folder removed successfully.");
                loggerSupa('UploadedSTL.Info', `Uploads folder removed successfully.`, '', userId);
              }
            })
          });
        };
        
        res.json({ success: true, message: 'Inserting uploaded stl files successfully' });
      } catch (err) {
        logger.error(err.message);
        loggerSupa('UploadedSTL.Error', err.message, '', userId);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  module.exports = router;
