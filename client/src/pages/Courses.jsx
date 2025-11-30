import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Courses.css';

function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    theme: '',
    description: '',
    author: '',
    duration: '',
    level: 'Débutant',
    modules: [],
  });
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'Admin';
  const isInstructor = user?.role === 'Instructeur';
  const canEdit = isAdmin || isInstructor;

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      theme: '',
      description: '',
      author: user ? `${user.firstName} ${user.lastName}` : '',
      duration: '',
      level: 'Débutant',
      modules: [],
    });
    setShowCreateModal(true);
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      theme: course.theme || '',
      description: course.description || '',
      author: course.author || '',
      duration: course.duration || '',
      level: course.level || 'Débutant',
      modules: course.modules || [],
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await axios.put(`/api/courses/${editingCourse.id}`, formData);
      } else {
        await axios.post('/api/courses', formData);
      }
      setShowCreateModal(false);
      fetchCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Erreur lors de la sauvegarde du cours');
    }
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce cours ?')) return;

    try {
      await axios.delete(`/api/courses/${courseId}`);
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const addModule = () => {
    setFormData({
      ...formData,
      modules: [
        ...formData.modules,
        { title: '', contentBlocks: [] },
      ],
    });
  };

  const updateModule = (index, field, value) => {
    const newModules = [...formData.modules];
    newModules[index] = { ...newModules[index], [field]: value };
    setFormData({ ...formData, modules: newModules });
  };

  const addContentBlock = (moduleIndex) => {
    const newModules = [...formData.modules];
    newModules[moduleIndex].contentBlocks = [
      ...(newModules[moduleIndex].contentBlocks || []),
      { type: 'text', content: '' },
    ];
    setFormData({ ...formData, modules: newModules });
  };

  const updateContentBlock = (moduleIndex, blockIndex, field, value) => {
    const newModules = [...formData.modules];
    newModules[moduleIndex].contentBlocks[blockIndex] = {
      ...newModules[moduleIndex].contentBlocks[blockIndex],
      [field]: value,
    };
    setFormData({ ...formData, modules: newModules });
  };

  const removeModule = (index) => {
    const newModules = formData.modules.filter((_, i) => i !== index);
    setFormData({ ...formData, modules: newModules });
  };

  const removeContentBlock = (moduleIndex, blockIndex) => {
    const newModules = [...formData.modules];
    newModules[moduleIndex].contentBlocks = newModules[moduleIndex].contentBlocks.filter(
      (_, i) => i !== blockIndex
    );
    setFormData({ ...formData, modules: newModules });
  };

  const handleRegister = async (courseId) => {
    try {
      await axios.post(`/api/courses/${courseId}/register`);
      fetchCourses();
    } catch (error) {
      console.error('Error registering for course:', error);
      alert('Erreur lors de l\'inscription');
    }
  };

  const handleUnregister = async (courseId) => {
    try {
      await axios.delete(`/api/courses/${courseId}/register`);
      fetchCourses();
    } catch (error) {
      console.error('Error unregistering from course:', error);
      alert('Erreur lors de la désinscription');
    }
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="courses">
      <div className="courses-header">
        <h1 className="page-title">
          <span className="title-icon">🎓</span>
          <span className="title-text">Formations</span>
        </h1>
        <p className="courses-subtitle">Développez vos compétences avec nos cours en ligne</p>
        {canEdit && (
          <div className="create-button-container">
            <button className="create-button" onClick={handleCreate}>
              <span className="create-icon">+</span>
              Créer un cours
            </button>
          </div>
        )}
      </div>

      {selectedCourse ? (
        <div className="course-detail">
          <button className="back-button" onClick={() => setSelectedCourse(null)}>
            ← Retour
          </button>
          <h2>{selectedCourse.title}</h2>
          {selectedCourse.description && (
            <p className="course-description">{selectedCourse.description}</p>
          )}
          {selectedCourse.theme && (
            <div className="course-theme">Thématique: {selectedCourse.theme}</div>
          )}
          {selectedCourse.author && (
            <div className="course-author">Auteur: {selectedCourse.author}</div>
          )}
          {selectedCourse.duration && (
            <div className="course-duration">Durée: {selectedCourse.duration}</div>
          )}
          <div className="course-modules-count">
            {selectedCourse.modules?.length || 0} module(s)
          </div>
          
          {selectedCourse.user_registered ? (
            <button
              className="unregister-btn"
              onClick={() => handleUnregister(selectedCourse.id)}
            >
              Se désinscrire
            </button>
          ) : (
            <button
              className="register-btn"
              onClick={() => handleRegister(selectedCourse.id)}
            >
              S'inscrire au cours
            </button>
          )}

          <div className="modules-list">
            {selectedCourse.modules?.map((module, moduleIndex) => (
              <div key={moduleIndex} className="module-card">
                <h3 className="module-title">
                  Module {moduleIndex + 1}: {module.title}
                </h3>
                <div className="content-blocks">
                  {module.contentBlocks?.map((block, blockIndex) => (
                    <div key={blockIndex} className="content-block">
                      {block.type === 'text' && (
                        <div className="content-text">{block.content}</div>
                      )}
                      {block.type === 'image' && (
                        <img src={block.content} alt="Content" className="content-image" />
                      )}
                      {block.type === 'video' && (
                        <video src={block.content} controls className="content-video" />
                      )}
                      {block.type === 'audio' && (
                        <audio src={block.content} controls className="content-audio" />
                      )}
                      {block.type === 'embed' && (
                        <div
                          className="content-embed"
                          dangerouslySetInnerHTML={{ __html: block.content }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        {courses.length === 0 ? (
          <div className="empty-courses">
            <div className="empty-courses-icon">📚</div>
            <h3>Aucun cours disponible</h3>
            <p>Il n'y a pas encore de cours sur la plateforme.</p>
            {canEdit && (
              <button className="create-first-course-btn" onClick={handleCreate}>
                <span className="create-icon">+</span>
                Créer le premier cours
              </button>
            )}
            {!canEdit && (
              <p className="empty-message">Les cours seront bientôt disponibles.</p>
            )}
          </div>
        ) : (
          <div className="courses-grid">
            {courses.map((course) => {
            const themeColors = {
              'Leadership': '#9c27b0',
              'Communication': '#2196f3',
              'Intelligence émotionnelle': '#e91e63',
              'Développement personnel': '#ff9800',
              'Gestion d\'équipe': '#4caf50',
              'Autre': '#9e9e9e',
            };
            const headerColor = themeColors[course.theme] || '#9c27b0';
            const registeredCount = course.registrations_count || 0;
            
            return (
              <div key={course.id} className="course-card">
                <div className="course-card-header" style={{ backgroundColor: headerColor }}>
                  <span className="book-icon">📖</span>
                  <span className="level-badge">{course.level || 'Débutant'}</span>
                </div>
                <div className="course-card-body">
                  <div className="course-category-tag" style={{ backgroundColor: headerColor + '20', color: headerColor }}>
                    {course.theme?.toUpperCase() || 'COURS'}
                  </div>
                  <h3 className="course-title">{course.title}</h3>
                  <p className="course-description">
                    {course.description ? (course.description.length > 100 ? course.description.substring(0, 100) + '...' : course.description) : 'Aucune description'}
                  </p>
                  <div className="course-details">
                    <div className="course-detail-item">
                      <span className="detail-icon">🕐</span>
                      <span>{course.duration || 'N/A'}</span>
                    </div>
                    <div className="course-detail-item">
                      <span className="detail-icon">📚</span>
                      <span>{course.modules_count || course.modules?.length || 0} modules</span>
                    </div>
                    <div className="course-detail-item">
                      <span className="detail-icon">👥</span>
                      <span>{registeredCount} participant{registeredCount > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="course-instructor">
                    <div className="instructor-avatar">
                      {course.author?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <span className="instructor-name">{course.author || 'Auteur inconnu'}</span>
                  </div>
                  <div className="course-actions-footer">
                    <button
                      className="view-btn"
                      onClick={() => setSelectedCourse(course)}
                    >
                      <span className="action-icon">👁️</span>
                      Voir
                    </button>
                    {canEdit && (isAdmin || course.instructor_id === user?.id) && (
                      <button
                        className="edit-btn-action"
                        onClick={() => handleEdit(course)}
                      >
                        <span className="action-icon">✏️</span>
                        Modifier
                      </button>
                    )}
                    {course.user_registered ? (
                      <button
                        className="registered-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnregister(course.id);
                        }}
                      >
                        <span className="action-icon">✓</span>
                        Inscrit
                      </button>
                    ) : (
                      <button
                        className="register-btn-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegister(course.id);
                        }}
                        style={{ backgroundColor: headerColor }}
                      >
                        S'inscrire
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>{editingCourse ? 'Modifier le cours' : 'Créer un cours'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Titre *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Thématique *</label>
                <select
                  value={formData.theme}
                  onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                  required
                >
                  <option value="">Sélectionner une thématique</option>
                  <option value="Leadership">Leadership</option>
                  <option value="Communication">Communication</option>
                  <option value="Intelligence émotionnelle">Intelligence émotionnelle</option>
                  <option value="Développement personnel">Développement personnel</option>
                  <option value="Gestion d'équipe">Gestion d'équipe</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  placeholder="Description du cours..."
                />
              </div>
              <div className="form-group">
                <label>Auteur *</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  required
                  placeholder="Nom de l'auteur"
                />
              </div>
              <div className="form-group">
                <label>Durée</label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="Ex: 2h, 5 jours, 3 semaines..."
                />
              </div>
              <div className="form-group">
                <label>Niveau</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                >
                  <option value="Débutant">Débutant</option>
                  <option value="Intermédiaire">Intermédiaire</option>
                  <option value="Avancé">Avancé</option>
                </select>
              </div>

              <div className="modules-section">
                <div className="section-header">
                  <h3>Modules</h3>
                  <button type="button" onClick={addModule} className="add-module-btn">
                    + Ajouter un module
                  </button>
                </div>

                {formData.modules.map((module, moduleIndex) => (
                  <div key={moduleIndex} className="module-form">
                    <div className="module-header">
                      <input
                        type="text"
                        value={module.title}
                        onChange={(e) => updateModule(moduleIndex, 'title', e.target.value)}
                        placeholder="Titre du module"
                        className="module-title-input"
                      />
                      <button
                        type="button"
                        onClick={() => removeModule(moduleIndex)}
                        className="remove-btn"
                      >
                        Supprimer
                      </button>
                    </div>

                    <div className="content-blocks-section">
                      <button
                        type="button"
                        onClick={() => addContentBlock(moduleIndex)}
                        className="add-content-btn"
                      >
                        + Ajouter un contenu
                      </button>

                      {module.contentBlocks?.map((block, blockIndex) => (
                        <div key={blockIndex} className="content-block-form">
                          <select
                            value={block.type}
                            onChange={(e) =>
                              updateContentBlock(moduleIndex, blockIndex, 'type', e.target.value)
                            }
                            className="content-type-select"
                          >
                            <option value="text">Texte</option>
                            <option value="image">Photo (URL)</option>
                            <option value="video">Vidéo (URL)</option>
                            <option value="audio">Audio (URL)</option>
                            <option value="embed">Embed (HTML)</option>
                          </select>
                          <input
                            type="text"
                            value={block.content}
                            onChange={(e) =>
                              updateContentBlock(moduleIndex, blockIndex, 'content', e.target.value)
                            }
                            placeholder={
                              block.type === 'text'
                                ? 'Texte du contenu'
                                : block.type === 'embed'
                                ? 'Code HTML'
                                : 'URL'
                            }
                            className="content-input"
                          />
                          <button
                            type="button"
                            onClick={() => removeContentBlock(moduleIndex, blockIndex)}
                            className="remove-content-btn"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  Annuler
                </button>
                <button type="submit">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Courses;




