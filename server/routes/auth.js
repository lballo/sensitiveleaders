const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'Participant' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user exists
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (user) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      db.run(
        'INSERT INTO users (email, password, firstName, lastName, role) VALUES (?, ?, ?, ?, ?)',
        [email, hashedPassword, firstName, lastName, role],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          const token = jwt.sign(
            { id: this.lastID, email, role },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          res.status(201).json({
            token,
            user: {
              id: this.lastID,
              email,
              firstName,
              lastName,
              role
            }
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          photo: user.photo
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', authenticate, (req, res) => {
  db.get('SELECT id, email, role, photo, firstName, lastName, country, city, bio, languages, interests, intentions FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Parse JSON fields
    user.languages = user.languages ? JSON.parse(user.languages) : [];
    user.interests = user.interests ? JSON.parse(user.interests) : [];
    user.intentions = user.intentions ? JSON.parse(user.intentions) : [];

    res.json(user);
  });
});

module.exports = router;




