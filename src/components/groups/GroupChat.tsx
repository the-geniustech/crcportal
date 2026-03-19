import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, Smile, MoreVertical, Pin, Reply, Image as ImageIcon, Users, ArrowLeft } from 'lucide-react';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  message: string;
  timestamp: string;
  isPinned?: boolean;
  replyTo?: {
    userName: string;
    message: string;
  };
}

interface GroupChatProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  groupImage: string;
  memberCount: number;
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (message: string) => void;
}

const GroupChat: React.FC<GroupChatProps> = ({
  isOpen,
  onClose,
  groupName,
  groupImage,
  memberCount,
  messages,
  currentUserId,
  onSendMessage,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
      setReplyingTo(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = '';

  messages.forEach((msg) => {
    const msgDate = formatDate(msg.timestamp);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <img
            src={groupImage}
            alt={groupName}
            className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
          />
          <div className="flex-1">
            <h3 className="font-semibold text-white">{groupName}</h3>
            <p className="text-xs text-emerald-100 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {memberCount} members
            </p>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Pinned Messages */}
        {messages.some(m => m.isPinned) && (
          <div className="bg-amber-50 px-4 py-2 border-b border-amber-100">
            <div className="flex items-center gap-2 text-amber-700">
              <Pin className="w-4 h-4" />
              <span className="text-sm font-medium">Pinned Message</span>
            </div>
            <p className="text-sm text-amber-600 truncate mt-1">
              {messages.find(m => m.isPinned)?.message}
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs font-medium rounded-full">
                  {group.date}
                </span>
              </div>

              {/* Messages */}
              {group.messages.map((msg) => {
                const isOwnMessage = msg.userId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex mb-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isOwnMessage && (
                      <img
                        src={msg.userAvatar}
                        alt={msg.userName}
                        className="w-8 h-8 rounded-full object-cover mr-2 mt-1"
                      />
                    )}
                    <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                      {!isOwnMessage && (
                        <p className="text-xs text-gray-500 mb-1 ml-1">{msg.userName}</p>
                      )}
                      {msg.replyTo && (
                        <div className={`text-xs px-3 py-2 rounded-t-xl border-l-2 ${
                          isOwnMessage 
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-700' 
                            : 'bg-gray-200 border-gray-400 text-gray-600'
                        }`}>
                          <p className="font-medium">{msg.replyTo.userName}</p>
                          <p className="truncate">{msg.replyTo.message}</p>
                        </div>
                      )}
                      <div
                        className={`px-4 py-2.5 ${msg.replyTo ? 'rounded-b-xl' : 'rounded-2xl'} ${
                          isOwnMessage
                            ? 'bg-emerald-500 text-white rounded-br-md'
                            : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <p className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-emerald-100' : 'text-gray-400'
                        }`}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                      {/* Message Actions */}
                      <div className={`flex gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Preview */}
        {replyingTo && (
          <div className="bg-gray-100 px-4 py-2 flex items-center gap-3 border-t border-gray-200">
            <div className="flex-1">
              <p className="text-xs text-emerald-600 font-medium">
                Replying to {replyingTo.userName}
              </p>
              <p className="text-sm text-gray-600 truncate">{replyingTo.message}</p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}

        {/* Input */}
        <div className="bg-white border-t border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <ImageIcon className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="w-full px-4 py-2.5 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <Smile className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className={`p-3 rounded-full transition-colors ${
                newMessage.trim()
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupChat;
