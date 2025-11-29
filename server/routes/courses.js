const express = require('express');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all courses
router.get('/', authenticate, (req, res) => {
  db.all('SELECT * FROM courses ORDER BY createdAt DESC', (err, courses) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get modules for each course
    const coursesWithModules = courses.map(course => {
      return new Promise((resolve) => {
        db.all(
          `SELECT m.*, 
                  (SELECT COUNT(*) FROM content_blocks WHERE module_id = m.id) as content_count
           FROM modules m
           WHERE m.course_id = ?
           ORDER BY m.order_index`,
          [course.id],
          (err, modules) => {
            if (err) {
              resolve({ ...course, modules: [] });
            } else {
              // Get content blocks for each module
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
                resolve({ ...course, modules: results });
              });
            }
          }
        );
      });
    });

    Promise.all(coursesWithModules).then(results => {
      res.json(results);
    });
  });
});

// Get course by ID
router.get('/:id', authenticate, (req, res) => {
  db.get('SELECT * FROM courses WHERE id = ?', [req.params.id], (err, course) => {
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
  });
});

// Create course (Admin only)
router.post('/', authenticate, requireRole('Admin'), (req, res) => {
  const { title, description, language, modules } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  db.run(
    'INSERT INTO courses (title, description, language) VALUES (?, ?, ?)',
    [title, description, language],
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
          db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, course) => {
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
          });
        };

        insertModule(modules[0]);
      } else {
        res.status(201).json({ id: courseId, title, description, language, modules: [] });
      }
    }
  );
});

// Update course (Admin only)
router.put('/:id', authenticate, requireRole('Admin'), (req, res) => {
  const courseId = req.params.id;
  const { title, description, language, modules } = req.body;

  db.run(
    'UPDATE courses SET title = ?, description = ?, language = ? WHERE id = ?',
    [title, description, language, courseId],
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
            db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, course) => {
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
            });
          };

          insertModule(modules[0]);
        } else {
          returnCourse();
        }
      });
    }
  );
});

// Delete course (Admin only)
router.delete('/:id', authenticate, requireRole('Admin'), (req, res) => {
  const courseId = req.params.id;

  db.all('SELECT id FROM modules WHERE course_id = ?', [courseId], (err, modules) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    modules.forEach(module => {
      db.run('DELETE FROM content_blocks WHERE module_id = ?', [module.id]);
      db.run('DELETE FROM modules WHERE id = ?', [module.id]);
    });

    db.run('DELETE FROM courses WHERE id = ?', [courseId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ message: 'Course deleted successfully' });
    });
  });
});

module.exports = router;



