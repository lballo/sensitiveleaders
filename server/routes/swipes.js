const express = require('express');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Create swipe
router.post('/', authenticate, (req, res) => {
  const { swiped_id, action } = req.body;
  const swiper_id = req.user.id;

  if (!swiped_id || !action || !['like', 'pass'].includes(action)) {
    return res.status(400).json({ error: 'Invalid swipe data' });
  }

  if (swiper_id === swiped_id) {
    return res.status(400).json({ error: 'Cannot swipe on yourself' });
  }

  // Check if already swiped
  db.get('SELECT * FROM swipes WHERE swiper_id = ? AND swiped_id = ?', [swiper_id, swiped_id], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (existing) {
      return res.status(400).json({ error: 'Already swiped on this user' });
    }

    // Create swipe
    db.run(
      'INSERT INTO swipes (swiper_id, swiped_id, action) VALUES (?, ?, ?)',
      [swiper_id, swiped_id, action],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // If it's a like, check for mutual match
        if (action === 'like') {
          db.get(
            'SELECT * FROM swipes WHERE swiper_id = ? AND swiped_id = ? AND action = ?',
            [swiped_id, swiper_id, 'like'],
            (err, mutualSwipe) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              if (mutualSwipe) {
                // Create match
                const userA = Math.min(swiper_id, swiped_id);
                const userB = Math.max(swiper_id, swiped_id);

                db.run(
                  'INSERT OR IGNORE INTO matches (user_a_id, user_b_id) VALUES (?, ?)',
                  [userA, userB],
                  (err) => {
                    if (err) {
                      console.error('Error creating match:', err);
                    }
                  }
                );
              }
            }
          );
        }

        res.json({ message: 'Swipe recorded', match: action === 'like' });
      }
    );
  });
});

module.exports = router;




