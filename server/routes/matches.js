const express = require('express');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all matches for current user
router.get('/', authenticate, (req, res) => {
  const userId = req.user.id;

  db.all(
    `SELECT m.id, m.createdAt,
            CASE 
              WHEN m.user_a_id = ? THEN m.user_b_id
              ELSE m.user_a_id
            END as matched_user_id,
            u.photo, u.firstName, u.lastName, u.country, u.city
     FROM matches m
     JOIN users u ON (CASE WHEN m.user_a_id = ? THEN m.user_b_id ELSE m.user_a_id END = u.id)
     WHERE m.user_a_id = ? OR m.user_b_id = ?
     ORDER BY m.createdAt DESC`,
    [userId, userId, userId, userId],
    (err, matches) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json(matches);
    }
  );
});

module.exports = router;



