import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Inspiration.css';

function Inspiration() {
  const { user } = useAuth();
  const [inspirations, setInspirations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    category: 'Affirmation',
  });

  useEffect(() => {
    fetchInspirations();
  }, []);

  const fetchInspirations = async () => {
    try {
      const response = await axios.get('/api/inspirations');
      setInspirations(response.data);
    } catch (error) {
      console.error('Error fetching inspirations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    try {
      const response = await axios.post('/api/inspirations', formData);
      setInspirations([response.data, ...inspirations]);
      setFormData({ content: '', category: 'Affirmation' });
      setShowModal(false);
    } catch (error) {
      console.error('Error creating inspiration:', error);
      alert('Erreur lors de la création de l\'inspiration');
    }
  };

  const handleLike = async (inspirationId, currentLiked) => {
    try {
      const response = await axios.post(`/api/inspirations/${inspirationId}/like`);
      setInspirations(
        inspirations.map((insp) =>
          insp.id === inspirationId
            ? {
                ...insp,
                user_liked: response.data.liked ? 1 : 0,
                likes_count: response.data.likes_count,
              }
            : insp
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDelete = async (inspirationId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette inspiration ?')) {
      return;
    }

    try {
      await axios.delete(`/api/inspirations/${inspirationId}`);
      setInspirations(inspirations.filter((insp) => insp.id !== inspirationId));
    } catch (error) {
      console.error('Error deleting inspiration:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="inspiration">
      <h1 className="page-title">
        <span className="title-icon">✨</span>
        <span className="title-text">Inspiration</span>
      </h1>
      <p className="page-subtitle">Partagez vos affirmations, rêves et projets</p>

      <button className="share-button" onClick={() => setShowModal(true)}>
        + Partager une inspiration
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Partager une inspiration</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Catégorie</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="Affirmation">Affirmation</option>
                  <option value="Rêve">Rêve</option>
                  <option value="Projet">Projet</option>
                  <option value="Histoire">Histoire</option>
                </select>
              </div>
              <div className="form-group">
                <label>Contenu</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Écrivez votre inspiration..."
                  required
                  rows="5"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>
                  Annuler
                </button>
                <button type="submit">Partager</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="inspirations-list">
        {inspirations.length === 0 ? (
          <div className="empty-state">
            <p>Aucune inspiration partagée pour le moment.</p>
            <p>Soyez le premier à partager !</p>
          </div>
        ) : (
          inspirations.map((inspiration) => (
            <div key={inspiration.id} className="inspiration-card">
              <div className="card-header">
                <div className="card-user">
                  {inspiration.photo ? (
                    <img
                      src={inspiration.photo}
                      alt={inspiration.firstName}
                      className="user-avatar"
                    />
                  ) : (
                    <div className="user-avatar-placeholder">
                      {inspiration.firstName?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="user-info">
                    <div className="user-name">
                      {inspiration.firstName} {inspiration.lastName}
                    </div>
                    <div className="post-date">{formatDate(inspiration.createdAt)}</div>
                  </div>
                </div>
                {user?.id === inspiration.user_id && (
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(inspiration.id)}
                    title="Supprimer"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="card-content">{inspiration.content}</div>
              <div className="card-footer">
                <button
                  className={`like-btn ${inspiration.user_liked ? 'liked' : ''}`}
                  onClick={() => handleLike(inspiration.id, inspiration.user_liked)}
                >
                  <span className="like-icon">❤️</span>
                  <span className="like-count">{inspiration.likes_count || 0}</span>
                </button>
                <div className="category-tag">
                  <span className="tag-icon">✨</span>
                  <span>{inspiration.category}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Inspiration;


