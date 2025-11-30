const express = require('express');
const { db } = require('../config/database');
const { authenticate, requireRole, requireInstructorOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all courses
router.get('/', authenticate, (req, res) => {
  db.all(
    `SELECT c.*, u.firstName as instructor_firstName, u.lastName as instructor_lastName,
     (SELECT COUNT(*) FROM modules WHERE course_id = c.id) as modules_count,
     (SELECT COUNT(*) FROM course_registrations WHERE course_id = c.id) as registrations_count,
     (SELECT COUNT(*) FROM course_registrations WHERE course_id = c.id AND user_id = ?) as user_registered
     FROM courses c
     LEFT JOIN users u ON c.instructor_id = u.id
     ORDER BY c.createdAt DESC`,
    [req.user.id],
    (err, courses) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Get modules for each course
      const coursesWithModules = courses.map(course => {
        return new Promise((resolve) => {
          // If no modules, resolve immediately with empty array
          if (!course.id) {
            resolve({ ...course, modules: [] });
            return;
          }

          db.all(
            `SELECT m.*, 
                    (SELECT COUNT(*) FROM content_blocks WHERE module_id = m.id) as content_count
             FROM modules m
             WHERE m.course_id = ?
             ORDER BY m.order_index`,
            [course.id],
            (err, modules) => {
              if (err) {
                console.error('Error fetching modules:', err);
                resolve({ ...course, modules: [] });
              } else {
                // Get content blocks for each module
                if (!modules || modules.length === 0) {
                  resolve({ ...course, modules: [] });
                  return;
                }

                const modulesWithContent = modules.map(module => {
                  return new Promise((resolve) => {
                    db.all(
                      'SELECT * FROM content_blocks WHERE module_id = ? ORDER BY order_index',
                      [module.id],
                      (err, contentBlocks) => {
                        if (err) {
                          console.error('Error fetching content blocks:', err);
                          resolve({ ...module, contentBlocks: [] });
                        } else {
                          resolve({ ...module, contentBlocks: contentBlocks || [] });
                        }
                      }
                    );
                  });
                });

                Promise.all(modulesWithContent).then(results => {
                  resolve({ ...course, modules: results || [] });
                }).catch(err => {
                  console.error('Error in Promise.all modules:', err);
                  resolve({ ...course, modules: [] });
                });
              }
            }
          );
        });
      });

      Promise.all(coursesWithModules).then(results => {
        console.log('Sending courses:', results.length);
        res.json(results || []);
      }).catch(err => {
        console.error('Error in Promise.all courses:', err);
        res.json(courses || []);
      });
    }
  );
});

// Get course by ID
router.get('/:id', authenticate, (req, res) => {
  db.get(
    `SELECT c.*, u.firstName as instructor_firstName, u.lastName as instructor_lastName,
     (SELECT COUNT(*) FROM course_registrations WHERE course_id = c.id AND user_id = ?) as user_registered
     FROM courses c
     LEFT JOIN users u ON c.instructor_id = u.id
     WHERE c.id = ?`,
    [req.user.id, req.params.id],
    (err, course) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      db.all(
        'SELECT * FROM modules WHERE course_id = ? ORDER BY order_index',
        [course.id],
        (err, modules) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          const modulesWithContent = modules.map(module => {
            return new Promise((resolve) => {
              db.all(
                'SELECT * FROM content_blocks WHERE module_id = ? ORDER BY order_index',
                [module.id],
                (err, contentBlocks) => {
                  if (err) {
                    resolve({ ...module, contentBlocks: [] });
                  } else {
                    resolve({ ...module, contentBlocks });
                  }
                }
              );
            });
          });

          Promise.all(modulesWithContent).then(results => {
            res.json({ ...course, modules: results });
          });
        }
      );
    }
  );
});

// Create course (Admin or Instructeur)
router.post('/', authenticate, requireInstructorOrAdmin, (req, res) => {
  const { title, theme, description, author, duration, level, modules } = req.body;
  const currentUserId = req.user.id;
  const currentUserRole = req.user.role;

  if (!title || !theme || !author) {
    return res.status(400).json({ error: 'Title, theme, and author are required' });
  }

  const instructorId = currentUserRole === 'Admin' ? (req.body.instructor_id || currentUserId) : currentUserId;
  const modulesCount = modules && modules.length > 0 ? modules.length : 0;

  db.run(
    'INSERT INTO courses (title, theme, description, author, duration, level, modules_count, instructor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [title, theme, description, author, duration, level || 'Débutant', modulesCount, instructorId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const courseId = this.lastID;

      if (modules && modules.length > 0) {
        let moduleIndex = 0;
        const insertModule = (module) => {
          db.run(
            'INSERT INTO modules (course_id, title, order_index) VALUES (?, ?, ?)',
            [courseId, module.title, moduleIndex],
            function(err) {
              if (err) {
                console.error('Error inserting module:', err);
                moduleIndex++;
                if (moduleIndex < modules.length) {
                  insertModule(modules[moduleIndex]);
                } else {
                  returnCourse();
                }
                return;
              }

              const moduleId = this.lastID;

              if (module.contentBlocks && module.contentBlocks.length > 0) {
                let contentIndex = 0;
                const insertContent = (contentBlock) => {
                  db.run(
                    'INSERT INTO content_blocks (module_id, type, content, order_index) VALUES (?, ?, ?, ?)',
                    [moduleId, contentBlock.type, contentBlock.content, contentIndex],
                    (err) => {
                      if (err) {
                        console.error('Error inserting content block:', err);
                      }
                      contentIndex++;
                      if (contentIndex < module.contentBlocks.length) {
                        insertContent(module.contentBlocks[contentIndex]);
                      } else {
                        moduleIndex++;
                        if (moduleIndex < modules.length) {
                          insertModule(modules[moduleIndex]);
                        } else {
                          returnCourse();
                        }
                      }
                    }
                  );
                };
                insertContent(module.contentBlocks[0]);
              } else {
                moduleIndex++;
                if (moduleIndex < modules.length) {
                  insertModule(modules[moduleIndex]);
                } else {
                  returnCourse();
                }
              }
            }
          );
        };

        const returnCourse = () => {
          db.get(
            `SELECT c.*, u.firstName as instructor_firstName, u.lastName as instructor_lastName
             FROM courses c
             LEFT JOIN users u ON c.instructor_id = u.id
             WHERE c.id = ?`,
            [courseId],
            (err, course) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              db.all(
                'SELECT * FROM modules WHERE course_id = ? ORDER BY order_index',
                [courseId],
                (err, modules) => {
                  if (err) {
                    return res.status(500).json({ error: err.message });
                  }

                  const modulesWithContent = modules.map(module => {
                    return new Promise((resolve) => {
                      db.all(
                        'SELECT * FROM content_blocks WHERE module_id = ? ORDER BY order_index',
                        [module.id],
                        (err, contentBlocks) => {
                          if (err) {
                            resolve({ ...module, contentBlocks: [] });
                          } else {
                            resolve({ ...module, contentBlocks });
                          }
                        }
                      );
                    });
                  });

                  Promise.all(modulesWithContent).then(results => {
                    res.status(201).json({ ...course, modules: results });
                  });
                }
              );
            }
          );
        };

        insertModule(modules[0]);
      } else {
        db.get(
          `SELECT c.*, u.firstName as instructor_firstName, u.lastName as instructor_lastName
           FROM courses c
           LEFT JOIN users u ON c.instructor_id = u.id
           WHERE c.id = ?`,
          [courseId],
          (err, course) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ ...course, modules: [] });
          }
        );
      }
    }
  );
});

// Update course (Admin or course instructor)
router.put('/:id', authenticate, requireInstructorOrAdmin, (req, res) => {
  const courseId = req.params.id;
  const { title, theme, description, author, duration, level, modules } = req.body;
  const currentUserId = req.user.id;
  const currentUserRole = req.user.role;

  // Check if user can edit this course
  db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (currentUserRole !== 'Admin' && course.instructor_id !== currentUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const modulesCount = modules && modules.length > 0 ? modules.length : 0;

    db.run(
      'UPDATE courses SET title = ?, theme = ?, description = ?, author = ?, duration = ?, level = ?, modules_count = ? WHERE id = ?',
      [title, theme, description, author, duration, level || 'Débutant', modulesCount, courseId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Delete existing modules and content blocks
        db.all('SELECT id FROM modules WHERE course_id = ?', [courseId], (err, existingModules) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          existingModules.forEach(module => {
            db.run('DELETE FROM content_blocks WHERE module_id = ?', [module.id]);
            db.run('DELETE FROM modules WHERE id = ?', [module.id]);
          });

          // Insert new modules
          if (modules && modules.length > 0) {
            let moduleIndex = 0;
            const insertModule = (module) => {
              db.run(
                'INSERT INTO modules (course_id, title, order_index) VALUES (?, ?, ?)',
                [courseId, module.title, moduleIndex],
                function(err) {
                  if (err) {
                    console.error('Error inserting module:', err);
                    moduleIndex++;
                    if (moduleIndex < modules.length) {
                      insertModule(modules[moduleIndex]);
                    } else {
                      returnCourse();
                    }
                    return;
                  }

                  const moduleId = this.lastID;

                  if (module.contentBlocks && module.contentBlocks.length > 0) {
                    let contentIndex = 0;
                    const insertContent = (contentBlock) => {
                      db.run(
                        'INSERT INTO content_blocks (module_id, type, content, order_index) VALUES (?, ?, ?, ?)',
                        [moduleId, contentBlock.type, contentBlock.content, contentIndex],
                        (err) => {
                          if (err) {
                            console.error('Error inserting content block:', err);
                          }
                          contentIndex++;
                          if (contentIndex < module.contentBlocks.length) {
                            insertContent(module.contentBlocks[contentIndex]);
                          } else {
                            moduleIndex++;
                            if (moduleIndex < modules.length) {
                              insertModule(modules[moduleIndex]);
                            } else {
                              returnCourse();
                            }
                          }
                        }
                      );
                    };
                    insertContent(module.contentBlocks[0]);
                  } else {
                    moduleIndex++;
                    if (moduleIndex < modules.length) {
                      insertModule(modules[moduleIndex]);
                    } else {
                      returnCourse();
                    }
                  }
                }
              );
            };

            const returnCourse = () => {
              db.get(
                `SELECT c.*, u.firstName as instructor_firstName, u.lastName as instructor_lastName
                 FROM courses c
                 LEFT JOIN users u ON c.instructor_id = u.id
                 WHERE c.id = ?`,
                [courseId],
                (err, course) => {
                  if (err) {
                    return res.status(500).json({ error: err.message });
                  }

                  db.all(
                    'SELECT * FROM modules WHERE course_id = ? ORDER BY order_index',
                    [courseId],
                    (err, modules) => {
                      if (err) {
                        return res.status(500).json({ error: err.message });
                      }

                      const modulesWithContent = modules.map(module => {
                        return new Promise((resolve) => {
                          db.all(
                            'SELECT * FROM content_blocks WHERE module_id = ? ORDER BY order_index',
                            [module.id],
                            (err, contentBlocks) => {
                              if (err) {
                                resolve({ ...module, contentBlocks: [] });
                              } else {
                                resolve({ ...module, contentBlocks });
                              }
                            }
                          );
                        });
                      });

                      Promise.all(modulesWithContent).then(results => {
                        res.json({ ...course, modules: results });
                      });
                    }
                  );
                }
              );
            };

            insertModule(modules[0]);
          } else {
            returnCourse();
          }
        });
      }
    );
  });
});

// Delete course (Admin or course instructor)
router.delete('/:id', authenticate, requireInstructorOrAdmin, (req, res) => {
  const courseId = req.params.id;
  const currentUserId = req.user.id;
  const currentUserRole = req.user.role;

  db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (currentUserRole !== 'Admin' && course.instructor_id !== currentUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    db.all('SELECT id FROM modules WHERE course_id = ?', [courseId], (err, modules) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      modules.forEach(module => {
        db.run('DELETE FROM content_blocks WHERE module_id = ?', [module.id]);
        db.run('DELETE FROM modules WHERE id = ?', [module.id]);
      });

      db.run('DELETE FROM course_registrations WHERE course_id = ?', [courseId]);
      db.run('DELETE FROM courses WHERE id = ?', [courseId], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({ message: 'Course deleted successfully' });
      });
    });
  });
});

// Register for course
router.post('/:id/register', authenticate, (req, res) => {
  const courseId = req.params.id;
  const userId = req.user.id;

  db.run(
    'INSERT OR IGNORE INTO course_registrations (course_id, user_id) VALUES (?, ?)',
    [courseId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ message: 'Registered for course successfully' });
    }
  );
});

// Unregister from course
router.delete('/:id/register', authenticate, (req, res) => {
  const courseId = req.params.id;
  const userId = req.user.id;

  db.run(
    'DELETE FROM course_registrations WHERE course_id = ? AND user_id = ?',
    [courseId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ message: 'Unregistered from course successfully' });
    }
  );
});

module.exports = router;
