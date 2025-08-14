import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Archive, Paperclip, Image, Video, FileText, Send, Users, Clock, ChevronRight, Plus, Bell } from 'lucide-react';

const NewsFlow = () => {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [showNewStoryModal, setShowNewStoryModal] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [newStoryParticipants, setNewStoryParticipants] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const response = await fetch('/api/stories');
      const data = await response.json();
      setStories(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading stories:', error);
      setLoading(false);
    }
  };

  const handleMessageClick = async (messageId, storyId) => {
    try {
      await fetch(`/api/messages/${messageId}/read`, {
        method: 'POST'
      });
      
      setStories(prev => prev.map(story => {
        if (story.id === storyId) {
          const messageToMove = story.newMessages.find(msg => msg.id === messageId);
          if (messageToMove) {
            return {
              ...story,
              newMessages: story.newMessages.filter(msg => msg.id !== messageId),
              archivedMessages: [{ ...messageToMove, is_new: false }, ...story.archivedMessages]
            };
          }
        }
        return story;
      }));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedStory) return;
    
    try {
      // Handle file uploads first if any files are selected
      let attachments = [];
      if (fileInputRef.current?.files && fileInputRef.current.files.length > 0) {
        console.log('Files selected:', fileInputRef.current.files.length);
        
        const formData = new FormData();
        Array.from(fileInputRef.current.files).forEach(file => {
          console.log('Adding file:', file.name, file.type);
          formData.append('files', file);
        });
        
        console.log('Uploading files...');
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        console.log('Upload response status:', uploadResponse.status);
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          console.log('Upload result:', uploadResult);
          attachments = uploadResult.files || [];
          console.log('Processed attachments:', attachments);
        } else {
          const errorText = await uploadResponse.text();
          console.error('Upload failed:', errorText);
        }
      }
      
      // Send message with attachment info
      console.log('Sending message with attachments:', attachments);
      const response = await fetch(`/api/stories/${selectedStory.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          author: 'You',
          content: newMessage,
          timePosted: 'now',
          attachments: attachments
        })
      });
      
      console.log('Message response status:', response.status);
      const result = await response.json();
      console.log('Message result:', result);
      
      // Update local state with new message(s)
      setStories(prev => prev.map(story => {
        if (story.id === selectedStory.id) {
          const newMessages = [...story.newMessages];
          
          if (result.userMessage) {
            // The message should already have attachments from the database
            newMessages.push(result.userMessage);
          }
          
          if (result.aiMessage) {
            newMessages.push(result.aiMessage);
          }
          
          return { ...story, newMessages };
        }
        return story;
      }));
      
      setNewMessage("");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert(`Failed to send message: ${error.message}`);
    }
  };

  const createNewStory = async () => {
    if (!newStoryTitle.trim()) return;
    
    try {
      console.log('Creating new story...');
      const participantsList = newStoryParticipants
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);
      
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newStoryTitle,
          participants: participantsList.length > 0 ? participantsList : ["You"]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const newStory = await response.json();
      console.log('New story created:', newStory);
      
      setStories(prev => [newStory, ...prev]);
      setSelectedStory(newStory);
      setShowNewStoryModal(false);
      setNewStoryTitle("");
      setNewStoryParticipants("");
    } catch (error) {
      console.error('Error creating story:', error);
      alert(`Failed to create story: ${error.message}`);
    }
  };

  const toggleNotifications = () => {
    if (!selectedStory) return;
    
    setNotificationsEnabled(prev => {
      const newSet = new Set(prev);
      if (newSet.has(selectedStory.id)) {
        newSet.delete(selectedStory.id);
      } else {
        newSet.add(selectedStory.id);
      }
      return newSet;
    });
  };

  const archiveStory = async () => {
    if (!selectedStory) return;
    
    if (window.confirm(`Archive "${selectedStory.title}"?`)) {
      try {
        await fetch(`/api/stories?storyId=${selectedStory.id}`, {
          method: 'DELETE'
        });
        
        setStories(prev => prev.filter(story => story.id !== selectedStory.id));
        setSelectedStory(null);
      } catch (error) {
        console.error('Error archiving story:', error);
      }
    }
  };

  const getAttachmentIcon = (type) => {
    if (type?.includes('image')) return <Image className="w-4 h-4" />;
    if (type?.includes('video')) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading NewsFlow...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Story List Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">NewsFlow</h1>
            <button 
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => setShowNewStoryModal(true)}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="text-sm text-gray-600">Active Stories</div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {stories.map(story => (
            <div 
              key={story.id}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedStory?.id === story.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => setSelectedStory(story)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">{story.title}</h3>
                {story.newMessages.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                    {story.newMessages.length}
                  </span>
                )}
              </div>
              
              <div className="flex items-center text-xs text-gray-500 mb-2">
                <Users className="w-3 h-3 mr-1" />
                {story.participants.length} participants
              </div>
              
              {story.newMessages.length > 0 && (
                <div className="text-xs text-gray-600 truncate">
                  Latest: {story.newMessages[story.newMessages.length - 1].content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* New Story Modal */}
      {showNewStoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Story</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Story Title *
                </label>
                <input
                  type="text"
                  value={newStoryTitle}
                  onChange={(e) => setNewStoryTitle(e.target.value)}
                  placeholder="e.g., City Budget Vote Coverage"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Members
                </label>
                <input
                  type="text"
                  value={newStoryParticipants}
                  onChange={(e) => setNewStoryParticipants(e.target.value)}
                  placeholder="Sarah Chen, Mike Rodriguez, Alex Kim (separate with commas)"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Optional - you can add team members later</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowNewStoryModal(false);
                  setNewStoryTitle("");
                  setNewStoryParticipants("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createNewStory}
                disabled={!newStoryTitle.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Create Story
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedStory ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedStory.title}</h2>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Users className="w-4 h-4 mr-1" />
                    {selectedStory.participants.join(", ")}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={toggleNotifications}
                    className={`p-2 rounded-lg transition-colors ${
                      notificationsEnabled.has(selectedStory.id) 
                        ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                    title={notificationsEnabled.has(selectedStory.id) ? 'Notifications ON' : 'Notifications OFF'}
                  >
                    <Bell className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={archiveStory}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Archive this story"
                  >
                    <Archive className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* New Messages Section */}
              {selectedStory.newMessages.length > 0 && (
                <div>
                  <div className="flex items-center mb-3">
                    <div className="h-px bg-red-200 flex-1"></div>
                    <span className="px-3 text-sm font-medium text-red-600 bg-red-50 rounded-full">
                      {selectedStory.newMessages.length} New Message{selectedStory.newMessages.length > 1 ? 's' : ''}
                    </span>
                    <div className="h-px bg-red-200 flex-1"></div>
                  </div>
                  
                  {selectedStory.newMessages.map(message => (
                    <div 
                      key={message.id}
                      className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 cursor-pointer hover:bg-yellow-100 transition-colors"
                      onClick={() => handleMessageClick(message.id, selectedStory.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">{message.author}</span>
                          <span className="ml-2 text-sm text-gray-500 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {message.time_posted}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                      
                      <p className="text-gray-700 mb-2">{message.content}</p>
                      
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="space-y-2">
                          {message.attachments.map((attachment, idx) => (
                            <div key={idx} className="bg-white rounded border p-2">
                              {attachment.file_type?.includes('image') ? (
                                <div>
                                  <img 
                                    src={attachment.url} 
                                    alt={attachment.original_name}
                                    className="max-w-xs max-h-48 rounded mb-2"
                                  />
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Image className="w-4 h-4 mr-1" />
                                    {attachment.original_name}
                                  </div>
                                </div>
                              ) : attachment.file_type?.includes('video') ? (
                                <div>
                                  <video 
                                    src={attachment.url} 
                                    controls
                                    className="max-w-xs max-h-48 rounded mb-2"
                                  />
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Video className="w-4 h-4 mr-1" />
                                    {attachment.original_name}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center text-sm text-gray-600">
                                  <FileText className="w-4 h-4 mr-1" />
                                  <a 
                                    href={attachment.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    {attachment.original_name}
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Archived Messages Section */}
              {selectedStory.archivedMessages.length > 0 && (
                <div>
                  <div className="flex items-center mb-3">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <span className="px-3 text-sm font-medium text-gray-500 bg-gray-50 rounded-full">
                      Previous Messages ({selectedStory.archivedMessages.length})
                    </span>
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </div>
                  
                  {selectedStory.archivedMessages.map(message => (
                    <div 
                      key={message.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">{message.author}</span>
                          <span className="ml-2 text-sm text-gray-500 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {message.time_posted}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-2">{message.content}</p>
                      
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="space-y-2">
                          {message.attachments.map((attachment, idx) => (
                            <div key={idx} className="bg-gray-50 rounded border p-2">
                              {attachment.file_type?.includes('image') ? (
                                <div>
                                  <img 
                                    src={attachment.url} 
                                    alt={attachment.original_name}
                                    className="max-w-xs max-h-48 rounded mb-2"
                                  />
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Image className="w-4 h-4 mr-1" />
                                    {attachment.original_name}
                                  </div>
                                </div>
                              ) : attachment.file_type?.includes('video') ? (
                                <div>
                                  <video 
                                    src={attachment.url} 
                                    controls
                                    className="max-w-xs max-h-48 rounded mb-2"
                                  />
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Video className="w-4 h-4 mr-1" />
                                    {attachment.original_name}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center text-sm text-gray-600">
                                  <FileText className="w-4 h-4 mr-1" />
                                  <a 
                                    href={attachment.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    {attachment.original_name}
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message... (Use @ai to get AI assistance)"
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                </div>
                
                <div className="flex space-x-1">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  <button 
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Select a story to start collaborating</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsFlow;
