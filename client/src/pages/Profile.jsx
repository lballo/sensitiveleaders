import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

function Profile() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    country: '',
    city: '',
    bio: '',
    languages: [],
    interests: [],
    intentions: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const languagesOptions = ['Français', 'Anglais', 'Espagnol', 'Allemand', 'Italien', 'Autre'];
  const intentionsOptions = [
    { value: 'love', label: 'Amour' },
    { value: 'amitié', label: 'Amitié' },
    { value: 'networking', label: 'Networking' },
    { value: 'apprenant', label: 'Apprenant' },
    { value: 'co-createur', label: 'Co-créateur' },
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`/api/users/${user.id}`);
      setFormData({
        firstName: response.data.firstName || '',
        lastName: response.data.lastName || '',
        country: response.data.country || '',
        city: response.data.city || '',
        bio: response.data.bio || '',
        languages: response.data.languages || [],
        interests: response.data.interests || [],
        intentions: response.data.intentions || [],
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleArrayChange = (name, value) => {
    const current = formData[name];
    if (current.includes(value)) {
      setFormData({ ...formData, [name]: current.filter((item) => item !== value) });
    } else {
      setFormData({ ...formData, [name]: [...current, value] });
    }
  };

  const handleInterestsChange = (e) => {
    const interests = e.target.value.split(',').map((i) => i.trim()).filter(Boolean);
    setFormData({ ...formData, interests });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await axios.put(`/api/users/${user.id}`, formData);
      updateUser(response.data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="profile">
      <h1 className="page-title">
        <span className="title-icon">👤</span>
        <span className="title-text">Mon Profil</span>
      </h1>

      <div className="profile-card">
        <div className="profile-header">
          <h2>Informations</h2>
          <button
            className="edit-button"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Annuler' : 'Modifier'}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="profile-avatar-section">
            {user?.photo ? (
              <img src={user.photo} alt={user.firstName} className="profile-avatar" />
            ) : (
              <div className="profile-avatar-placeholder">
                {formData.firstName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="profile-name">
              {formData.firstName} {formData.lastName}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Prénom</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

            <div className="form-group">
              <label>Nom</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

            <div className="form-group">
              <label>Pays</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="France"
              />
            </div>

            <div className="form-group">
              <label>Ville</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Paris"
              />
            </div>

            <div className="form-group full-width">
              <label>Biographie</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                disabled={!isEditing}
                rows="4"
                placeholder="Parlez-nous de vous..."
              />
            </div>

            <div className="form-group full-width">
              <label>Langues parlées</label>
              <div className="checkbox-group">
                {languagesOptions.map((lang) => (
                  <label key={lang} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.languages.includes(lang)}
                      onChange={() => handleArrayChange('languages', lang)}
                      disabled={!isEditing}
                    />
                    <span>{lang}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group full-width">
              <label>Centres d'intérêt (séparés par des virgules)</label>
              <input
                type="text"
                value={formData.interests.join(', ')}
                onChange={handleInterestsChange}
                disabled={!isEditing}
                placeholder="Leadership, Développement personnel, Innovation..."
              />
            </div>

            <div className="form-group full-width">
              <label>Intentions</label>
              <div className="checkbox-group">
                {intentionsOptions.map((intention) => (
                  <label key={intention.value} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.intentions.includes(intention.value)}
                      onChange={() => handleArrayChange('intentions', intention.value)}
                      disabled={!isEditing}
                    />
                    <span>{intention.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="form-actions">
              <button type="submit" className="save-button" disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default Profile;



