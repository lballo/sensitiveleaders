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
    description: '',
    language: '',
    modules: [],
  });
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'Admin';

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
      description: '',
      language: '',
      modules: [],
    });
    setShowCreateModal(true);
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || '',
      language: course.language || '',
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

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="courses">
      <div className="courses-header">
        <h1 className="page-title">
          <span className="title-icon">🎓</span>
          <span className="title-text">Cours</span>
        </h1>
        {isAdmin && (
          <button className="create-button" onClick={handleCreate}>
            + Créer un cours
          </button>
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
          {selectedCourse.language && (
            <div className="course-language">Langue: {selectedCourse.language}</div>
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
        <div className="courses-grid">
          {courses.map((course) => (
            <div key={course.id} className="course-card">
              <div className="course-header">
                <h3 className="course-title">{course.title}</h3>
                {isAdmin && (
                  <div className="course-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(course)}
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(course.id)}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
              {course.description && (
                <div className="course-description">{course.description}</div>
              )}
              {course.language && (
                <div className="course-language">Langue: {course.language}</div>
              )}
              <div className="course-modules-count">
                {course.modules?.length || 0} module(s)
              </div>
              <button
                className="view-course-btn"
                onClick={() => setSelectedCourse(course)}
              >
                Voir le cours
              </button>
            </div>
          ))}
        </div>
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
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Langue</label>
                <input
                  type="text"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  placeholder="Français"
                />
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
                            <option value="image">Image (URL)</option>
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



