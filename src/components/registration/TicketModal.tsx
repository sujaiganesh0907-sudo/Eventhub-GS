import React, { useRef, useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Download, Printer, Share2, Calendar, MapPin, CheckCircle2, ShieldCheck, Clock, MessageSquare, Loader2 } from 'lucide-react';
import { IEventRegistration, IEvent } from '../../types';
import { api } from '../../services/api';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: IEventRegistration;
  event?: IEvent;
  onNavigateToGroup?: (groupId: string) => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  onClose,
  registration,
  event,
  onNavigateToGroup,
}) => {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [eventGroup, setEventGroup] = useState<any | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(false);

  const eventId = registration.eventId || event?._id;

  useEffect(() => {
    if (!isOpen || !eventId) return;
    const checkGroup = async () => {
      try {
        setLoadingGroup(true);
        const res = await api.get<any>(`/events/${eventId}/group`);
        if (res.success && res.hasGroup && res.group) {
          setEventGroup(res.group);
        } else {
          setEventGroup(null);
        }
      } catch (err) {
        setEventGroup(null);
      } finally {
        setLoadingGroup(false);
      }
    };
    checkGroup();
  }, [isOpen, eventId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (registration.qrCodeUrl) {
      const link = document.createElement('a');
      link.href = registration.qrCodeUrl;
      link.download = `ticket-${registration.registrationId}.png`;
      link.click();
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `My Event Ticket: ${registration.eventTitle || event?.title}`,
        text: `I am attending ${registration.eventTitle || event?.title} on EVENTHUB!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Event ticket link copied to clipboard!');
    }
  };

  const eventTitle = registration.eventTitle || event?.title || 'Campus Event';
  const eventDate = registration.eventDate || event?.eventDate || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Event Entry Pass"
      subtitle="Present this verified QR pass at the entrance scan desk"
      maxWidth="md"
    >
      <div className="space-y-4 py-2">
        {/* Printable Pass Card */}
        <div
          ref={ticketRef}
          className="rounded-2xl border-2 border-[var(--border-color)] bg-[var(--surface)] overflow-hidden shadow-sm"
        >
          {/* Ticket Header */}
          <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-blue-200">
                EVENTHUB VERIFIED ENTRY
              </span>
              <h3 className="text-base font-extrabold tracking-tight mt-0.5 line-clamp-1">
                {eventTitle}
              </h3>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-white/20 backdrop-blur-xs text-[11px] font-bold">
              {registration.registrationType}
            </div>
          </div>

          {/* Ticket Body with QR */}
          <div className="p-5 flex flex-col items-center text-center space-y-4">
            {/* High-res Persistent QR Code */}
            <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-xs flex items-center justify-center">
              {registration.qrCodeUrl ? (
                <img
                  src={registration.qrCodeUrl}
                  alt={`QR Code for ${registration.registrationId}`}
                  className="w-48 h-48 object-contain"
                />
              ) : (
                <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-xs text-slate-400 font-mono">
                  Loading QR...
                </div>
              )}
            </div>

            {/* Registration ID Badge */}
            <div>
              <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                Registration Pass ID
              </p>
              <p className="text-lg font-mono font-black text-[var(--text-primary)] tracking-wide">
                {registration.registrationId}
              </p>
            </div>

            {/* Participant Details Table */}
            <div className="w-full pt-3 border-t border-dashed border-[var(--border-color)] grid grid-cols-2 gap-3 text-left text-xs">
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Participant</span>
                <span className="font-bold text-[var(--text-primary)]">{registration.studentName}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Institution</span>
                <span className="font-bold text-[var(--text-primary)] truncate block">{registration.studentCollege}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Event Date</span>
                <span className="font-bold text-[var(--text-primary)]">{eventDate}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Payment Status</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {registration.paymentStatus}
                </span>
              </div>
            </div>

            {registration.attended && (
              <div className="w-full p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Attendance Verified & Scanned
              </div>
            )}

            {/* EVENT GROUP ACCESS (Requirement 5) */}
            {eventGroup && (
              <div className="w-full p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-between gap-3 text-left">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                    Official Participant Community
                  </span>
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {eventGroup.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateToGroup) {
                      onNavigateToGroup(eventGroup._id);
                    } else {
                      window.location.href = `/messages?group=${eventGroup._id}`;
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Join Event Group</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" /> Download QR
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
