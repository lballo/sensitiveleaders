const express = require('express');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');

const router = express.Router();

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Get all posts (community wall)
router.get('/', authenticate, (req, res) => {
  db.all(
    `SELECT p.*, u.photo, u.firstName, u.lastName
     FROM posts p
     JOIN users u ON p.user_id = u.id
     ORDER BY p.createdAt DESC`,
    (err, posts) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json(posts);
    }
  );
});

// Create post
router.post('/', authenticate, upload.single('image'), (req, res) => {
  const userId = req.user.id;
  const { content } = req.body;
  const imageUrl = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : null;

  if (!content && !imageUrl) {
    return res.status(400).json({ error: 'Content or image is required' });
  }

  db.run(
    'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
    [userId, content, imageUrl],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.get(
        `SELECT p.*, u.photo, u.firstName, u.lastName
         FROM posts p
         JOIN users u ON p.user_id = u.id
         WHERE p.id = ?`,
        [this.lastID],
        (err, post) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          res.status(201).json(post);
        }
      );
    }
  );
});

// Delete post (own post or admin)
router.delete('/:id', authenticate, (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  db.get('SELECT * FROM posts WHERE id = ?', [postId], (err, post) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user_id !== userId && userRole !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    db.run('DELETE FROM posts WHERE id = ?', [postId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ message: 'Post deleted successfully' });
    });
  });
});

module.exports = router;

