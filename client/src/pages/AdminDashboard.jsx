import { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, eventsRes, coursesRes] = await Promise.all([
        axios.get('/api/users'),
        axios.get('/api/events'),
        axios.get('/api/courses'),
      ]);
      setUsers(usersRes.data);
      setEvents(eventsRes.data);
      setCourses(coursesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`/api/users/${userId}/role`, { role: newRole });
      fetchData();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Erreur lors de la mise à jour du rôle');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      await axios.delete(`/api/users/${userId}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleEventRegistration = async (eventId, userId, isRegistered) => {
    try {
      if (isRegistered) {
        await axios.delete(`/api/events/${eventId}/register`, {
          data: { user_id: userId },
        });
      } else {
        // Note: This would require a backend modification to allow admin to register users
        // For now, we'll just show the current registrations
      }
      fetchData();
    } catch (error) {
      console.error('Error managing registration:', error);
    }
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="admin-dashboard">
      <h1 className="page-title">
        <span className="title-icon">🛡️</span>
        <span className="title-text">Dashboard Administrateur</span>
      </h1>

      <div className="admin-tabs">
        <div className="admin-section">
          <h2>Gestion des Utilisateurs</h2>
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      {user.firstName} {user.lastName}
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="role-select"
                      >
                        <option value="Participant">Participant</option>
                        <option value="Instructeur">Instructeur</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="delete-user-btn"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-section">
          <h2>Événements</h2>
          <div className="events-list">
            {events.map((event) => (
              <div key={event.id} className="admin-event-card">
                <h3>{event.title}</h3>
                <div className="event-info">
                  <div>
                    <strong>Date:</strong>{' '}
                    {new Date(event.date).toLocaleDateString('fr-FR')}
                  </div>
                  <div>
                    <strong>Instructeur:</strong> {event.instructor_firstName}{' '}
                    {event.instructor_lastName}
                  </div>
                  <div>
                    <strong>Participants:</strong> {event.registrations?.length || 0}
                  </div>
                  {event.registrations && event.registrations.length > 0 && (
                    <div className="registrations-list">
                      <strong>Inscrits:</strong>
                      <ul>
                        {event.registrations.map((userId) => {
                          const user = users.find((u) => u.id === userId);
                          return user ? (
                            <li key={userId}>
                              {user.firstName} {user.lastName} ({user.email})
                            </li>
                          ) : null;
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-section">
          <h2>Cours</h2>
          <div className="courses-list">
            {courses.map((course) => (
              <div key={course.id} className="admin-course-card">
                <h3>{course.title}</h3>
                <div className="course-info">
                  <div>
                    <strong>Langue:</strong> {course.language || 'N/A'}
                  </div>
                  <div>
                    <strong>Modules:</strong> {course.modules?.length || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;




