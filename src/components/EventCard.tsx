import React from 'react';
import { Calendar, User, Shirt, Clock, Trash2, Mail, MessageCircle } from 'lucide-react';
import { BackendEvent } from '../types';

interface EventCardProps {
  event: BackendEvent;
  onDelete: (id: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onDelete }) => {
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Check if we have any contact info to show actions
  const hasContactInfo = event.staff_assigned || event.client_email || event.client_phone;
  const hasWhatsApp = event.staff_phone || event.client_phone;
  const hasEmail = event.staff_email || event.client_email;

  // Generate WhatsApp link
  const getWhatsAppLink = () => {
    const phone = event.staff_phone || event.client_phone;
    if (!phone) return '#';
    const staffName = event.staff_assigned || 'Staff';
    const text = `Hello ${staffName}, regarding the ${event.title} on ${formatDate(event.date)}`;
    return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
  };

  // Generate Email link
  const getEmailLink = () => {
    const email = event.staff_email || event.client_email;
    if (!email) return '#';
    const subject = `Event Details: ${event.title}`;
    const body = `Hi, checking in on ${event.title} scheduled for ${formatDate(event.date)}`;
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Handle missing phone for WhatsApp
  const handleWhatsAppClick = (e: React.MouseEvent) => {
    if (!hasWhatsApp) {
      e.preventDefault();
      alert('No phone number available. Please add contact info first.');
    }
  };

  // Handle missing email
  const handleEmailClick = (e: React.MouseEvent) => {
    if (!hasEmail) {
      e.preventDefault();
      alert('No email address available. Please add contact info first.');
    }
  };

  return (
    <div className="bg-gray-800 p-5 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-mono text-blue-400">{event.id}</span>
        <button
          onClick={() => onDelete(event.id)}
          className="text-red-400 hover:text-red-300 p-2 -m-2"
          title="Delete event"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <h3 className="font-medium mb-2 text-base">{event.title}</h3>

      <div className="space-y-2 text-sm text-gray-400 mb-4">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(event.date)}
        </div>
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {event.staff_assigned || 'Unassigned'}
        </div>
        <div className="flex items-center gap-1">
          <Shirt className="w-3 h-3" />
          {event.dress_code}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {event.duration}hr (Arrive: {formatTime(event.arrival_time)})
        </div>
      </div>

      {/* Contact Action Row - only show if contact info exists */}
      {hasContactInfo && (
        <div className="flex items-center gap-3 pt-3 border-t border-gray-700">
          <a
            href={getWhatsAppLink()}
            onClick={handleWhatsAppClick}
            className="flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors p-2 -m-2 min-h-[44px] min-w-[44px] justify-center"
            title="Contact via WhatsApp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
          <a
            href={getEmailLink()}
            onClick={handleEmailClick}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors p-2 -m-2 min-h-[44px] min-w-[44px] justify-center"
            title="Contact via Email"
          >
            <Mail className="w-5 h-5" />
            <span className="hidden sm:inline">Email</span>
          </a>
        </div>
      )}
    </div>
  );
};

export default EventCard;
