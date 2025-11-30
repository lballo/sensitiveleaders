const express = require('express');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all inspirations
router.get('/', authenticate, (req, res) => {
  db.all(
    `SELECT i.*, u.photo, u.firstName, u.lastName,
     (SELECT COUNT(*) FROM inspiration_likes WHERE inspiration_id = i.id) as likes_count,
     (SELECT COUNT(*) FROM inspiration_likes WHERE inspiration_id = i.id AND user_id = ?) as user_liked
     FROM inspirations i
     JOIN users u ON i.user_id = u.id
     ORDER BY i.createdAt DESC`,
    [req.user.id],
    (err, inspirations) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json(inspirations);
    }
  );
});

// Create inspiration
router.post('/', authenticate, (req, res) => {
  const userId = req.user.id;
  const { content, category } = req.body;

  if (!content || !category) {
    return res.status(400).json({ error: 'Content and category are required' });
  }

  const validCategories = ['Affirmation', 'Rêve', 'Projet', 'Histoire'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  db.run(
    'INSERT INTO inspirations (user_id, content, category) VALUES (?, ?, ?)',
    [userId, content, category],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.get(
        `SELECT i.*, u.photo, u.firstName, u.lastName,
         (SELECT COUNT(*) FROM inspiration_likes WHERE inspiration_id = i.id) as likes_count,
         0 as user_liked
         FROM inspirations i
         JOIN users u ON i.user_id = u.id
         WHERE i.id = ?`,
        [this.lastID],
        (err, inspiration) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          res.status(201).json(inspiration);
        }
      );
    }
  );
});

// Toggle like on inspiration
router.post('/:id/like', authenticate, (req, res) => {
  const inspirationId = req.params.id;
  const userId = req.user.id;

  // Check if already liked
  db.get(
    'SELECT * FROM inspiration_likes WHERE inspiration_id = ? AND user_id = ?',
    [inspirationId, userId],
    (err, like) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (like) {
        // Unlike
        db.run(
          'DELETE FROM inspiration_likes WHERE inspiration_id = ? AND user_id = ?',
          [inspirationId, userId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            db.get(
              'SELECT COUNT(*) as count FROM inspiration_likes WHERE inspiration_id = ?',
              [inspirationId],
              (err, result) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }
                res.json({ liked: false, likes_count: result.count });
              }
            );
          }
        );
      } else {
        // Like
        db.run(
          'INSERT INTO inspiration_likes (inspiration_id, user_id) VALUES (?, ?)',
          [inspirationId, userId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            db.get(
              'SELECT COUNT(*) as count FROM inspiration_likes WHERE inspiration_id = ?',
              [inspirationId],
              (err, result) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }
                res.json({ liked: true, likes_count: result.count });
              }
            );
          }
        );
      }
    }
  );
});

// Delete inspiration (own inspiration or admin)
router.delete('/:id', authenticate, (req, res) => {
  const inspirationId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  db.get('SELECT * FROM inspirations WHERE id = ?', [inspirationId], (err, inspiration) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!inspiration) {
      return res.status(404).json({ error: 'Inspiration not found' });
    }

    if (inspiration.user_id !== userId && userRole !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    db.run('DELETE FROM inspirations WHERE id = ?', [inspirationId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ message: 'Inspiration deleted successfully' });
    });
  });
});

module.exports = router;


