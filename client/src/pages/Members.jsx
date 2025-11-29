import { useState, useEffect } from 'react';
import axios from 'axios';
import './Members.css';

function Members() {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [filters, setFilters] = useState({
    country: '',
    language: '',
    intentions: [],
    interests: '',
  });
  const [loading, setLoading] = useState(true);

  const languagesOptions = ['Français', 'Anglais', 'Espagnol', 'Allemand', 'Italien'];
  const intentionsOptions = [
    { value: 'love', label: 'Amour' },
    { value: 'amitié', label: 'Amitié' },
    { value: 'networking', label: 'Networking' },
    { value: 'apprenant', label: 'Apprenant' },
    { value: 'co-createur', label: 'Co-créateur' },
  ];

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [members, filters]);

  const fetchMembers = async () => {
    try {
      const response = await axios.get('/api/users/search/filtered');
      setMembers(response.data);
      setFilteredMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...members];

    if (filters.country) {
      filtered = filtered.filter((m) => m.country === filters.country);
    }

    if (filters.language) {
      filtered = filtered.filter((m) => m.languages?.includes(filters.language));
    }

    if (filters.intentions.length > 0) {
      filtered = filtered.filter((m) =>
        filters.intentions.some((int) => m.intentions?.includes(int))
      );
    }

    if (filters.interests) {
      const interestLower = filters.interests.toLowerCase();
      filtered = filtered.filter((m) =>
        m.interests?.some((int) => int.toLowerCase().includes(interestLower))
      );
    }

    setFilteredMembers(filtered);
  };

  const handleFilterChange = (name, value) => {
    if (name === 'intentions') {
      const newIntentions = filters.intentions.includes(value)
        ? filters.intentions.filter((i) => i !== value)
        : [...filters.intentions, value];
      setFilters({ ...filters, intentions: newIntentions });
    } else {
      setFilters({ ...filters, [name]: value });
    }
  };

  const getCountries = () => {
    const countries = [...new Set(members.map((m) => m.country).filter(Boolean))];
    return countries.sort();
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="members">
      <h1 className="page-title">
        <span className="title-icon">👥</span>
        <span className="title-text">Membres</span>
      </h1>

      <div className="members-container">
        <div className="filters-panel">
          <h3>Filtres</h3>
          <div className="filter-group">
            <label>Pays</label>
            <select
              value={filters.country}
              onChange={(e) => handleFilterChange('country', e.target.value)}
            >
              <option value="">Tous les pays</option>
              {getCountries().map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Langue</label>
            <select
              value={filters.language}
              onChange={(e) => handleFilterChange('language', e.target.value)}
            >
              <option value="">Toutes les langues</option>
              {languagesOptions.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Intentions</label>
            <div className="checkbox-group">
              {intentionsOptions.map((intention) => (
                <label key={intention.value} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.intentions.includes(intention.value)}
                    onChange={() => handleFilterChange('intentions', intention.value)}
                  />
                  <span>{intention.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Intérêts (recherche)</label>
            <input
              type="text"
              value={filters.interests}
              onChange={(e) => handleFilterChange('interests', e.target.value)}
              placeholder="Rechercher par intérêt..."
            />
          </div>

          <button
            className="reset-filters-btn"
            onClick={() => setFilters({ country: '', language: '', intentions: [], interests: '' })}
          >
            Réinitialiser
          </button>
        </div>

        <div className="members-grid">
          {filteredMembers.length === 0 ? (
            <div className="empty-state">
              <p>Aucun membre trouvé avec ces filtres</p>
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div key={member.id} className="member-card">
                <div className="member-avatar">
                  {member.photo ? (
                    <img src={member.photo} alt={member.firstName} />
                  ) : (
                    <div className="member-avatar-placeholder">
                      {member.firstName?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="member-info">
                  <h3 className="member-name">
                    {member.firstName} {member.lastName}
                  </h3>
                  <div className="member-location">
                    📍 {member.city}, {member.country}
                  </div>
                  {member.intentions && member.intentions.length > 0 && (
                    <div className="member-intentions">
                      {member.intentions.map((int) => {
                        const labels = {
                          love: '💕 Amour',
                          amitié: '👫 Amitié',
                          networking: '🤝 Networking',
                          apprenant: '📚 Apprenant',
                          'co-createur': '✨ Co-créateur',
                        };
                        return (
                          <span key={int} className="intention-tag">
                            {labels[int] || int}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {member.bio && (
                    <div className="member-bio">{member.bio.substring(0, 100)}...</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Members;

