import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Messages.css';

function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.other_user_id);
      const interval = setInterval(() => {
        fetchMessages(selectedConversation.other_user_id);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const response = await axios.get('/api/messages/conversations');
      setConversations(response.data);
      if (response.data.length > 0 && !selectedConversation) {
        setSelectedConversation(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const response = await axios.get(`/api/messages/${userId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const response = await axios.post('/api/messages', {
        receiver_id: selectedConversation.other_user_id,
        content: newMessage,
      });
      setMessages([...messages, response.data]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="messages">
      <h1 className="page-title">
        <span className="title-icon">💬</span>
        <span className="title-text">Messages</span>
      </h1>

      <div className="messages-container">
        <div className="conversations-sidebar">
          <h3>Conversations</h3>
          {conversations.length === 0 ? (
            <p className="empty-state">Aucune conversation</p>
          ) : (
            <div className="conversations-list">
              {conversations.map((conv) => (
                <div
                  key={conv.other_user_id}
                  className={`conversation-item ${
                    selectedConversation?.other_user_id === conv.other_user_id ? 'active' : ''
                  }`}
                  onClick={() => setSelectedConversation(conv)}
                >
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
            </div>
          )}
        </div>

        <div className="messages-main">
          {selectedConversation ? (
            <>
              <div className="messages-header">
                <div className="messages-header-user">
                  {selectedConversation.photo ? (
                    <img
                      src={selectedConversation.photo}
                      alt={selectedConversation.firstName}
                      className="messages-header-avatar"
                    />
                  ) : (
                    <div className="messages-header-avatar-placeholder">
                      {selectedConversation.firstName?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="messages-header-name">
                      {selectedConversation.firstName} {selectedConversation.lastName}
                    </div>
                  </div>
                </div>
              </div>

              <div className="messages-list">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message-item ${
                      message.sender_id === user.id ? 'sent' : 'received'
                    }`}
                  >
                    <div className="message-content">{message.content}</div>
                    <div className="message-time">
                      {new Date(message.createdAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="message-form">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Tapez votre message..."
                  className="message-input"
                />
                <button type="submit" className="message-send-btn">
                  Envoyer
                </button>
              </form>
            </>
          ) : (
            <div className="no-conversation-selected">
              <p>Sélectionnez une conversation pour commencer à discuter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Messages;




