-- Status notes carry an icon from a fixed set (shared-protocol's NOTE_ICONS)
-- instead of any emoji, so they look the same everywhere. Notes kept with an
-- emoji take the nearest icon, or the speech bubble.
ALTER TABLE users RENAME COLUMN status_emoji TO status_icon;
UPDATE users SET status_icon = CASE status_icon
    WHEN '🎧' THEN 'focus'
    WHEN '🎯' THEN 'focus'
    WHEN '🍜' THEN 'lunch'
    WHEN '☕' THEN 'coffee'
    WHEN '🚶' THEN 'away'
    WHEN '📅' THEN 'meeting'
    WHEN '🛠️' THEN 'code'
    WHEN '📞' THEN 'call'
    WHEN '🤒' THEN 'sick'
    WHEN '🌴' THEN 'holiday'
    WHEN '✈️' THEN 'travel'
    WHEN '🏠' THEN 'home'
    WHEN '🌙' THEN 'night'
    ELSE 'chat'
  END
  WHERE status_icon IS NOT NULL;
