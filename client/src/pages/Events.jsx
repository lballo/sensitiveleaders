import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Events.css';

function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    mode: 'online',
    location: '',
  });
  const [loading, setLoading] = useState(true);

  const canCreateEdit = user?.role === 'Admin' || user?.role === 'Instructeur';

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get('/api/events');
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setFormData({
      title: '',
      description: '',
      date: '',
      mode: 'online',
      location: '',
    });
    setShowCreateModal(true);
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      date: event.date.split('T')[0] + 'T' + event.date.split('T')[1].substring(0, 5),
      mode: event.mode,
      location: event.location || '',
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await axios.put(`/api/events/${editingEvent.id}`, formData);
      } else {
        await axios.post('/api/events', formData);
      }
      setShowCreateModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Erreur lors de la sauvegarde de l\'événement');
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return;

    try {
      await axios.delete(`/api/events/${eventId}`);
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleRegister = async (eventId, isRegistered) => {
    try {
      if (isRegistered) {
        await axios.delete(`/api/events/${eventId}/register`);
      } else {
        await axios.post(`/api/events/${eventId}/register`);
      }
      fetchEvents();
    } catch (error) {
      console.error('Error registering:', error);
    }
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="events">
      <div className="events-header">
        <h1 className="page-title">
          <span className="title-icon">📅</span>
          <span className="title-text">Événements</span>
        </h1>
        {canCreateEdit && (
          <button className="create-button" onClick={handleCreate}>
            + Créer un événement
          </button>
        )}
      </div>

      <div className="events-grid">
        {events.map((event) => {
          const eventDate = new Date(event.date);
          const isPast = eventDate < new Date();
          const isRegistered = event.registrations?.includes(user?.id);

          return (
            <div key={event.id} className={`event-card ${isPast ? 'past' : ''}`}>
              <div className="event-header">
                <h3 className="event-title">{event.title}</h3>
                {canCreateEdit && (event.instructor_id === user?.id || user?.role === 'Admin') && (
                  <div className="event-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(event)}
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(event.id)}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>

              {event.description && (
                <div className="event-description">{event.description}</div>
              )}

              <div className="event-details">
                <div className="event-detail">
                  <strong>📅 Date:</strong>{' '}
                  {eventDate.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="event-detail">
                  <strong>👤 Instructeur:</strong>{' '}
                  {event.instructor_firstName} {event.instructor_lastName}
                </div>
                <div className="event-detail">
                  <strong>📍 Mode:</strong> {event.mode === 'online' ? 'En ligne' : 'En présentiel'}
                </div>
                {event.location && (
                  <div className="event-detail">
                    <strong>🔗 Lieu/Lien:</strong>{' '}
                    {event.mode === 'online' ? (
                      <a href={event.location} target="_blank" rel="noopener noreferrer">
                        {event.location}
                      </a>
                    ) : (
                      event.location
                    )}
                  </div>
                )}
                <div className="event-detail">
                  <strong>👥 Participants:</strong> {event.registrations?.length || 0}
                </div>
              </div>

              {!isPast && (
                <button
                  className={`register-button ${isRegistered ? 'registered' : ''}`}
                  onClick={() => handleRegister(event.id, isRegistered)}
                >
                  {isRegistered ? '✓ Inscrit' : "S'inscrire"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingEvent ? 'Modifier l\'événement' : 'Créer un événement'}</h2>
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
                  rows="4"
                />
              </div>
              <div className="form-group">
                <label>Date et heure *</label>
                <input
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Mode *</label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  required
                >
                  <option value="online">En ligne</option>
                  <option value="offline">En présentiel</option>
                </select>
              </div>
              <div className="form-group">
                <label>{formData.mode === 'online' ? 'Lien visio' : 'Lieu physique'}</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder={formData.mode === 'online' ? 'https://zoom.us/...' : 'Adresse du lieu'}
                />
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

export default Events;



