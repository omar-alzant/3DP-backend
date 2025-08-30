const jwt = require('jsonwebtoken');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer token

  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // تحقق من المستخدم في قاعدة البيانات
    const { data: user, error } = await supabase
      .from('users')
      .select('current_token')
      .eq('id', decoded.id)
      .single();

      if (error || !user) return res.status(401).json({ error: 'User not found' });

      if (user.current_token !== token) {
        return res.status(403).json({ error: 'Session expired or used on another device' });
      }

    req.id = decoded.id; // attach userId to request
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
