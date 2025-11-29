const express = require('express');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all events
router.get('/', authenticate, (req, res) => {
  db.all(
    `SELECT e.*, u.firstName as instructor_firstName, u.lastName as instructor_lastName
     FROM events e
     LEFT JOIN users u ON e.instructor_id = u.id
     ORDER BY e.date ASC`,
    (err, events) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Get registrations for each event
      const eventsWithRegistrations = events.map(event => {
        return new Promise((resolve) => {
          db.all(
            'SELECT user_id FROM event_registrations WHERE event_id = ?',
            [event.id],
            (err, registrations) => {
              if (err) {
                resolve({ ...event, registrations: [] });
              } else {
                resolve({ ...event, registrations: registrations.map(r => r.user_id) });
              }
            }
          );
        });
      });

      Promise.all(eventsWithRegistrations).then(results => {
        res.json(results);
      });
    }
  );
});

// Get event by ID
router.get('/:id', authenticate, (req, res) => {
  db.get(
    `SELECT e.*, u.firstName as instructor_firstName, u.lastName as instructor_lastName
     FROM events e
     LEFT JOIN users u ON e.instructor_id = u.id
     WHERE e.id = ?`,
    [req.params.id],
    (err, event) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      db.all(
        'SELECT user_id FROM event_registrations WHERE event_id = ?',
        [event.id],
        (err, registrations) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          res.json({ ...event, registrations: registrations.map(r => r.user_id) });
        }
      );
    }
  );
});

// Create event (Admin or Instructeur)
router.post('/', authenticate, requireRole('Admin', 'Instructeur'), (req, res) => {
  const { title, description, date, instructor_id, mode, location } = req.body;
  const currentUserId = req.user.id;
  const currentUserRole = req.user.role;

  // If not admin, can only create events for themselves
  const finalInstructorId = currentUserRole === 'Admin' ? (instructor_id || currentUserId) : currentUserId;

  if (!title || !date || !mode) {
    return res.status(400).json({ error: 'Title, date, and mode are required' });
  }

  db.run(
    'INSERT INTO events (title, description, date, instructor_id, mode, location) VALUES (?, ?, ?, ?, ?, ?)',
    [title, description, date, finalInstructorId, mode, location],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.get(
        `SELECT e.*, u.firstName as instructor_firstName, u.lastName as instructor_lastName
         FROM events e
         LEFT JOIN users u ON e.instructor_id = u.id
         WHERE e.id = ?`,
        [this.lastID],
        (err, event) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          res.status(201).json({ ...event, registrations: [] });
        }
      );
    }
  );
});

// Update event (Admin or event instructor)
router.put('/:id', authenticate, requireRole('Admin', 'Instructeur'), (req, res) => {
  const eventId = req.params.id;
  const { title, description, date, instructor_id, mode, location } = req.body;
  const currentUserId = req.user.id;
  const currentUserRole = req.user.role;

  // Check if user can edit this event
  db.get('SELECT * FROM events WHERE id = ?', [eventId], (err, event) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (currentUserRole !== 'Admin' && event.instructor_id !== currentUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const finalInstructorId = currentUserRole === 'Admin' ? (instructor_id || event.instructor_id) : event.instructor_id;

    db.run(
      'UPDATE events SET title = ?, description = ?, date = ?, instructor_id = ?, mode = ?, location = ? WHERE id = ?',
      [title, description, date, finalInstructorId, mode, location, eventId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        db.get(
          `SELECT e.*, u.firstName as instructor_firstName, u.lastName as instructor_lastName
           FROM events e
           LEFT JOIN users u ON e.instructor_id = u.id
           WHERE e.id = ?`,
          [eventId],
          (err, updatedEvent) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            db.all(
              'SELECT user_id FROM event_registrations WHERE event_id = ?',
              [eventId],
              (err, registrations) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }

                res.json({ ...updatedEvent, registrations: registrations.map(r => r.user_id) });
              }
            );
          }
        );
      }
    );
  });
});

// Delete event (Admin or event instructor)
router.delete('/:id', authenticate, requireRole('Admin', 'Instructeur'), (req, res) => {
  const eventId = req.params.id;
  const currentUserId = req.user.id;
  const currentUserRole = req.user.role;

  db.get('SELECT * FROM events WHERE id = ?', [eventId], (err, event) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (currentUserRole !== 'Admin' && event.instructor_id !== currentUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    db.run('DELETE FROM events WHERE id = ?', [eventId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ message: 'Event deleted successfully' });
    });
  });
});

// Register for event
router.post('/:id/register', authenticate, (req, res) => {
  const eventId = req.params.id;
  const userId = req.user.id;

  db.run(
    'INSERT OR IGNORE INTO event_registrations (event_id, user_id) VALUES (?, ?)',
    [eventId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ message: 'Registered for event successfully' });
    }
  );
});

// Unregister from event
router.delete('/:id/register', authenticate, (req, res) => {
  const eventId = req.params.id;
  const userId = req.user.id;

  db.run(
    'DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?',
    [eventId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ message: 'Unregistered from event successfully' });
    }
  );
});

module.exports = router;



