const supabase = require('../config/supabase');


async function logEvent(type, message, fileName = null, userId = null) {
  await supabase.from('logs').insert([
    { type, message, file_name: fileName, user_id: userId }
  ]);
}

module.exports = logEvent;
