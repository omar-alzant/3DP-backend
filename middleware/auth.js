const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer token

  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const userId = jwt.decode(token)?.id;

    const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('current_token') // just select minimal data
    .eq('id', userId)
    .single(); // we expect one row

    if(profile.current_token){
      try{
        jwt.verify(token, process.env.JWT_SECRET);
        if (profileError) return res.status(401).json({ error: 'User not found' });
        if (profile.current_token.trim() !== token.trim()) {
          return res.status(403).json({ error: 'Session expired or used on another device' });
          }
        }
        catch(err){
          return res.status(403).json({ error: 'Session expired or used on another device' });
        }
      }

    req.id = userId; // attach userId to request
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
