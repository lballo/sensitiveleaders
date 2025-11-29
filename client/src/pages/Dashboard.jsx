import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

function Dashboard() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [matches, setMatches] = useState([]);
  const [events, setEvents] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [postsRes, matchesRes, eventsRes, conversationsRes] = await Promise.all([
        axios.get('/api/posts'),
        axios.get('/api/matches'),
        axios.get('/api/events'),
        axios.get('/api/messages/conversations'),
      ]);

      setPosts(postsRes.data);
      setMatches(matchesRes.data);
      const currentUserId = user?.id;
      setEvents(eventsRes.data.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= new Date() && e.registrations?.includes(currentUserId);
      }).slice(0, 5));
      setConversations(conversationsRes.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPostContent && !newPostImage) return;

    const formData = new FormData();
    formData.append('content', newPostContent);
    if (newPostImage) {
      formData.append('image', newPostImage);
    }

    try {
      const response = await axios.post('/api/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPosts([response.data, ...posts]);
      setNewPostContent('');
      setNewPostImage(null);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="dashboard">
      <h1 className="page-title">
        <span className="title-icon">🏠</span>
        <span className="title-text">Accueil</span>
      </h1>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <div className="post-section">
            <h2>Mur de la communauté</h2>
            <form onSubmit={handlePostSubmit} className="post-form">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Partagez quelque chose avec la communauté..."
                rows="3"
              />
              <div className="post-form-actions">
                <label className="file-upload-btn">
                  📷 Ajouter une photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewPostImage(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                </label>
                <button type="submit" className="post-submit-btn">
                  Publier
                </button>
              </div>
            </form>

            <div className="posts-list">
              {posts.map((post) => (
                <div key={post.id} className="post-card">
                  <div className="post-header">
                    <div className="post-author">
                      {post.photo ? (
                        <img src={post.photo} alt={post.firstName} className="post-avatar" />
                      ) : (
                        <div className="post-avatar-placeholder">
                          {post.firstName?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="post-author-name">
                          {post.firstName} {post.lastName}
                        </div>
                        <div className="post-date">
                          {new Date(post.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  </div>
                  {post.content && <div className="post-content">{post.content}</div>}
                  {post.image_url && (
                    <img src={post.image_url} alt="Post" className="post-image" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard-sidebar">
          <div className="sidebar-section">
            <h3>Mes matchs récents</h3>
            <div className="matches-list">
              {matches.slice(0, 5).map((match) => (
                <div key={match.id} className="match-item">
                  {match.photo ? (
                    <img src={match.photo} alt={match.firstName} className="match-avatar" />
                  ) : (
                    <div className="match-avatar-placeholder">
                      {match.firstName?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="match-info">
                    <div className="match-name">
                      {match.firstName} {match.lastName}
                    </div>
                    <div className="match-location">{match.city}</div>
                  </div>
                </div>
              ))}
              {matches.length === 0 && (
                <p className="empty-state">Aucun match pour le moment</p>
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Mes messages</h3>
            <div className="conversations-list">
              {conversations.map((conv) => (
                <div key={conv.other_user_id} className="conversation-item">
                  {conv.photo ? (
                    <img src={conv.photo} alt={conv.firstName} className="conversation-avatar" />
                  ) : (
                    <div className="conversation-avatar-placeholder">
                      {conv.firstName?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="conversation-info">
                    <div className="conversation-name">
                      {conv.firstName} {conv.lastName}
                    </div>
                    <div className="conversation-preview">{conv.last_message}</div>
                  </div>
                </div>
              ))}
              {conversations.length === 0 && (
                <p className="empty-state">Aucun message</p>
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Mes événements à venir</h3>
            <div className="events-list">
              {events.map((event) => (
                <div key={event.id} className="event-item">
                  <div className="event-date">
                    {new Date(event.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                  <div className="event-info">
                    <div className="event-title">{event.title}</div>
                    <div className="event-mode">{event.mode}</div>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <p className="empty-state">Aucun événement à venir</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

