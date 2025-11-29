import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Matching.css';

function Matching() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [matchFound, setMatchFound] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await axios.get('/api/users/matching/candidates');
      setCandidates(response.data);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (action) => {
    if (currentIndex >= candidates.length) return;

    const candidate = candidates[currentIndex];
    try {
      const response = await axios.post('/api/swipes', {
        swiped_id: candidate.id,
        action,
      });

      if (action === 'like' && response.data.match) {
        setMatchFound(true);
        setTimeout(() => setMatchFound(false), 3000);
      }

      setCurrentIndex(currentIndex + 1);
    } catch (error) {
      console.error('Error swiping:', error);
    }
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  if (currentIndex >= candidates.length) {
    return (
      <div className="matching">
        <div className="no-more-candidates">
          <h2>🎉</h2>
          <p>Vous avez vu tous les profils disponibles !</p>
          <p>Revenez plus tard pour découvrir de nouveaux membres.</p>
        </div>
      </div>
    );
  }

  const currentCandidate = candidates[currentIndex];

  return (
    <div className="matching">
      <h1 className="page-title">
        <span className="title-icon">❤️</span>
        <span className="title-text">Matching</span>
      </h1>

      {matchFound && (
        <div className="match-notification">
          <h2>🎉 C'est un match !</h2>
          <p>Vous pouvez maintenant discuter avec {currentCandidate.firstName} dans l'onglet Messages</p>
        </div>
      )}

      <div className="card-container">
        <div className="swipe-card">
          <div className="card-image">
            {currentCandidate.photo ? (
              <img src={currentCandidate.photo} alt={currentCandidate.firstName} />
            ) : (
              <div className="card-image-placeholder">
                {currentCandidate.firstName?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="card-content">
            <h2 className="card-name">
              {currentCandidate.firstName} {currentCandidate.lastName}
            </h2>
            <div className="card-location">
              📍 {currentCandidate.city}, {currentCandidate.country}
            </div>
            {currentCandidate.bio && (
              <div className="card-bio">{currentCandidate.bio}</div>
            )}
            {currentCandidate.languages && currentCandidate.languages.length > 0 && (
              <div className="card-languages">
                <strong>Langues:</strong> {currentCandidate.languages.join(', ')}
              </div>
            )}
            {currentCandidate.intentions && currentCandidate.intentions.length > 0 && (
              <div className="card-intentions">
                <strong>Intentions:</strong>{' '}
                {currentCandidate.intentions.map((int) => {
                  const labels = {
                    love: 'Amour',
                    amitié: 'Amitié',
                    networking: 'Networking',
                    apprenant: 'Apprenant',
                    'co-createur': 'Co-créateur',
                  };
                  return labels[int] || int;
                }).join(', ')}
              </div>
            )}
            {currentCandidate.interests && currentCandidate.interests.length > 0 && (
              <div className="card-interests">
                <strong>Intérêts:</strong> {currentCandidate.interests.join(', ')}
              </div>
            )}
          </div>
        </div>

        <div className="swipe-actions">
          <button
            className="swipe-button pass-button"
            onClick={() => handleSwipe('pass')}
          >
            ✕ Passer
          </button>
          <button
            className="swipe-button like-button"
            onClick={() => handleSwipe('like')}
          >
            ❤️ Like
          </button>
        </div>
      </div>
    </div>
  );
}

export default Matching;

