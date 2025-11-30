const express = require('express');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all conversations for current user
router.get('/conversations', authenticate, (req, res) => {
  const userId = req.user.id;

  db.all(
    `SELECT DISTINCT 
            CASE 
              WHEN sender_id = ? THEN receiver_id
              ELSE sender_id
            END as other_user_id,
            u.photo, u.firstName, u.lastName,
            (SELECT content FROM messages 
             WHERE (sender_id = ? AND receiver_id = other_user_id) 
             OR (sender_id = other_user_id AND receiver_id = ?)
             ORDER BY createdAt DESC LIMIT 1) as last_message,
            (SELECT createdAt FROM messages 
             WHERE (sender_id = ? AND receiver_id = other_user_id) 
             OR (sender_id = other_user_id AND receiver_id = ?)
             ORDER BY createdAt DESC LIMIT 1) as last_message_date
     FROM messages m
     JOIN users u ON (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END = u.id)
     WHERE m.sender_id = ? OR m.receiver_id = ?
     ORDER BY last_message_date DESC`,
    [userId, userId, userId, userId, userId, userId, userId, userId],
    (err, conversations) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json(conversations);
    }
  );
});

// Get messages with a specific user
router.get('/:userId', authenticate, (req, res) => {
  const currentUserId = req.user.id;
  const otherUserId = req.params.userId;

  // Verify they are matched
  db.get(
    'SELECT * FROM matches WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)',
    [currentUserId, otherUserId, otherUserId, currentUserId],
    (err, match) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!match) {
        return res.status(403).json({ error: 'Users are not matched' });
      }

      db.all(
        `SELECT m.*, u.photo, u.firstName, u.lastName
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
         ORDER BY m.createdAt ASC`,
        [currentUserId, otherUserId, otherUserId, currentUserId],
        (err, messages) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          res.json(messages);
        }
      );
    }
  );
});

// Send a message
router.post('/', authenticate, (req, res) => {
  const { receiver_id, content } = req.body;
  const sender_id = req.user.id;

  if (!receiver_id || !content) {
    return res.status(400).json({ error: 'Receiver ID and content are required' });
  }

  // Verify they are matched
  db.get(
    'SELECT * FROM matches WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)',
    [sender_id, receiver_id, receiver_id, sender_id],
    (err, match) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!match) {
        return res.status(403).json({ error: 'Users are not matched' });
      }

      db.run(
        'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
        [sender_id, receiver_id, content],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          db.get(
            `SELECT m.*, u.photo, u.firstName, u.lastName
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.id = ?`,
            [this.lastID],
            (err, message) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              res.status(201).json(message);
            }
          );
        }
      );
    }
  );
});

module.exports = router;




