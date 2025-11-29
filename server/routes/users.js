const express = require('express');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Get all users (Admin only)
router.get('/', authenticate, requireRole('Admin'), (req, res) => {
  db.all('SELECT id, email, role, photo, firstName, lastName, country, city, bio, languages, interests, intentions, createdAt FROM users', (err, users) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const formattedUsers = users.map(user => ({
      ...user,
      languages: user.languages ? JSON.parse(user.languages) : [],
      interests: user.interests ? JSON.parse(user.interests) : [],
      intentions: user.intentions ? JSON.parse(user.intentions) : []
    }));

    res.json(formattedUsers);
  });
});

// Get user by ID
router.get('/:id', authenticate, (req, res) => {
  db.get('SELECT id, email, role, photo, firstName, lastName, country, city, bio, languages, interests, intentions FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.languages = user.languages ? JSON.parse(user.languages) : [];
    user.interests = user.interests ? JSON.parse(user.interests) : [];
    user.intentions = user.intentions ? JSON.parse(user.intentions) : [];

    res.json(user);
  });
});

// Update user profile
router.put('/:id', authenticate, upload.single('photo'), (req, res) => {
  const userId = req.params.id;
  const currentUserId = req.user.id;
  const currentUserRole = req.user.role;

  // Check if user can update this profile
  if (userId != currentUserId && currentUserRole !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { firstName, lastName, country, city, bio, languages, interests, intentions } = req.body;

  let photoPath = null;
  if (req.file) {
    photoPath = `http://localhost:5000/uploads/${req.file.filename}`;
  }

  const updates = [];
  const values = [];

  if (firstName !== undefined) {
    updates.push('firstName = ?');
    values.push(firstName);
  }
  if (lastName !== undefined) {
    updates.push('lastName = ?');
    values.push(lastName);
  }
  if (country !== undefined) {
    updates.push('country = ?');
    values.push(country);
  }
  if (city !== undefined) {
    updates.push('city = ?');
    values.push(city);
  }
  if (bio !== undefined) {
    updates.push('bio = ?');
    values.push(bio);
  }
  if (languages !== undefined) {
    updates.push('languages = ?');
    values.push(JSON.stringify(languages));
  }
  if (interests !== undefined) {
    updates.push('interests = ?');
    values.push(JSON.stringify(interests));
  }
  if (intentions !== undefined) {
    updates.push('intentions = ?');
    values.push(JSON.stringify(intentions));
  }
  if (photoPath) {
    updates.push('photo = ?');
    values.push(photoPath);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(userId);

  db.run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.get('SELECT id, email, role, photo, firstName, lastName, country, city, bio, languages, interests, intentions FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        user.languages = user.languages ? JSON.parse(user.languages) : [];
        user.interests = user.interests ? JSON.parse(user.interests) : [];
        user.intentions = user.intentions ? JSON.parse(user.intentions) : [];

        res.json(user);
      });
    }
  );
});

// Update user role (Admin only)
router.put('/:id/role', authenticate, requireRole('Admin'), (req, res) => {
  const { role } = req.body;
  const validRoles = ['Admin', 'Instructeur', 'Participant'];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  db.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ message: 'Role updated successfully' });
  });
});

// Delete user (Admin only)
router.delete('/:id', authenticate, requireRole('Admin'), (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ message: 'User deleted successfully' });
  });
});

// Get users for matching (exclude current user and already swiped)
router.get('/matching/candidates', authenticate, (req, res) => {
  const userId = req.user.id;

  db.all(
    `SELECT u.id, u.email, u.photo, u.firstName, u.lastName, u.country, u.city, u.bio, u.languages, u.interests, u.intentions
     FROM users u
     WHERE u.id != ? 
     AND u.id NOT IN (SELECT swiped_id FROM swipes WHERE swiper_id = ?)
     AND u.role != 'Admin'`,
    [userId, userId],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const formattedUsers = users.map(user => ({
        ...user,
        languages: user.languages ? JSON.parse(user.languages) : [],
        interests: user.interests ? JSON.parse(user.interests) : [],
        intentions: user.intentions ? JSON.parse(user.intentions) : []
      }));

      res.json(formattedUsers);
    }
  );
});

// Get users with filters
router.get('/search/filtered', authenticate, (req, res) => {
  const { country, language, intentions, interests } = req.query;
  const userId = req.user.id;

  let query = `SELECT u.id, u.email, u.photo, u.firstName, u.lastName, u.country, u.city, u.bio, u.languages, u.interests, u.intentions
               FROM users u
               WHERE u.id != ? AND u.role != 'Admin'`;
  const params = [userId];

  if (country) {
    query += ' AND u.country = ?';
    params.push(country);
  }

  if (language) {
    query += ' AND u.languages LIKE ?';
    params.push(`%"${language}"%`);
  }

  if (intentions) {
    const intentionList = Array.isArray(intentions) ? intentions : [intentions];
    intentionList.forEach(intention => {
      query += ' AND u.intentions LIKE ?';
      params.push(`%"${intention}"%`);
    });
  }

  if (interests) {
    const interestList = Array.isArray(interests) ? interests : [interests];
    interestList.forEach(interest => {
      query += ' AND u.interests LIKE ?';
      params.push(`%"${interest}"%`);
    });
  }

  db.all(query, params, (err, users) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const formattedUsers = users.map(user => ({
      ...user,
      languages: user.languages ? JSON.parse(user.languages) : [],
      interests: user.interests ? JSON.parse(user.interests) : [],
      intentions: user.intentions ? JSON.parse(user.intentions) : []
    }));

    res.json(formattedUsers);
  });
});

module.exports = router;

