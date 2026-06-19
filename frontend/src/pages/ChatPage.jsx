import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/context/SocketContext';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import { bookingService } from '@/api/services/booking.service';
import {
  ArrowLeft,
  Send,
  MapPin,
  MessageSquare,
  Bell,
  Car,
  Loader2
} from 'lucide-react';
import EmptyState from '@/components/animations/EmptyState';
import { messageTransition, messageVariants } from '@/animations/chatVariants';
import ScrollReveal from '@/components/animations/ScrollReveal';
import { springGentle } from '@/animations/motionConfig';
import { paths } from '@/app/router/paths';

function mergeMessages(prev, incoming) {
  if (!incoming) return prev;
  const list = Array.isArray(incoming) ? incoming : [incoming];
  const map = new Map(prev.map((m) => [String(m._id), m]));
  for (const m of list) {
    if (m?._id) map.set(String(m._id), m);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );
}

export default function ChatPage() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = location.state?.from || paths.carpooling;
  const { user } = useAuth();
  const socket = useSocket();

  const [rideDetails, setRideDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(true);
  const [sending, setSending] = useState(false);
  const [driverPos, setDriverPos] = useState(null);
  const [eta, setEta] = useState('—');
  const [alerts, setAlerts] = useState('');

  const chatEndRef = useRef(null);

  const loadChatHistory = useCallback(async () => {
    if (!rideId) return;
    setLoadingChat(true);
    try {
      const res = await bookingService.getRideChat(rideId);
      setMessages(mergeMessages([], res.data || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChat(false);
    }
  }, [rideId]);

  useEffect(() => {
    fetchRideInfo();
    loadChatHistory();
  }, [rideId, loadChatHistory]);

  useEffect(() => {
    if (!socket || !rideId || !user?._id) return;

    socket.emit('join-ride-room', { rideId, userId: user._id });

    const onDriverMoved = (coords) => {
      setDriverPos({ lat: coords.lat, lng: coords.lng });
      if (coords.eta) setEta(coords.eta);
    };

    const onChatMsg = (msgObj) => {
      setMessages((prev) => mergeMessages(prev, msgObj));
    };

    socket.on('driver-moved', onDriverMoved);
    socket.on('chat-msg-received', onChatMsg);

    return () => {
      socket.off('driver-moved', onDriverMoved);
      socket.off('chat-msg-received', onChatMsg);
    };
  }, [socket, rideId, user?._id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchRideInfo = async () => {
    try {
      const { data } = await api.get(endpoints.rides.byId(rideId));
      if (data.success) {
        setRideDetails(data.ride);
        const c = data.ride?.origin?.location?.coordinates;
        if (c?.length === 2) setDriverPos({ lat: c[1], lng: c[0] });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || sending) return;

    setSending(true);
    setChatInput('');
    try {
      const res = await bookingService.sendRideChat(rideId, text);
      if (res.data) {
        setMessages((prev) => mergeMessages(prev, res.data));
      }
    } catch (err) {
      if (socket) {
        socket.emit('chat-msg', {
          rideId,
          senderId: user._id,
          senderName: user.name,
          message: text
        });
      } else {
        setChatInput(text);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center bg-slateCustom-800/40 p-4 border border-slateCustom-800 rounded-2xl shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="h-9 w-9 rounded-lg bg-slateCustom-800 hover:bg-slateCustom-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors border-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-white leading-none">
              Trip group chat
              {rideDetails?.vehicleId?.make
                ? ` · ${rideDetails.vehicleId.make} ${rideDetails.vehicleId.model || ''}`
                : ''}
            </h2>
            <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">
              {rideDetails?.origin?.address} → {rideDetails?.destination?.address}
            </span>
          </div>
        </div>
        {rideDetails?.status === 'ACTIVE' && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
            Ride in progress
          </span>
        )}
      </div>

      {alerts && (
        <div className="bg-green-500/10 border border-green-500/25 p-3 rounded-xl text-xs text-green-400 flex items-center gap-2.5 shrink-0">
          <Bell className="h-4 w-4 animate-bounce" />
          <span className="font-bold">{alerts}</span>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
        <ScrollReveal className="glass-panel rounded-2xl p-4 flex flex-col justify-between overflow-hidden relative min-h-[300px]">
          <div className="flex justify-between items-center z-10">
            <span className="text-[10px] font-bold text-slate-400 bg-slateCustom-800 px-2 py-0.5 rounded-full border border-slateCustom-700 uppercase tracking-widest flex items-center gap-1">
              <MapPin className="h-3 w-3 text-brand-400" />
              Route
            </span>
            <motion.span
              key={eta}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springGentle}
              className="text-xs text-brand-300 font-bold bg-brand-500/15 px-3 py-1 rounded-lg"
            >
              ETA: {eta}
            </motion.span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
            <Car className="h-12 w-12 text-brand-400/80" />
            <p className="text-sm text-white/75">
              {rideDetails?.driverId?.name
                ? `Driver: ${rideDetails.driverId.name}`
                : 'Coordinate pickup in chat'}
            </p>
            {driverPos && (
              <p className="text-[10px] text-white/45 font-mono">
                {driverPos.lat.toFixed(4)}, {driverPos.lng.toFixed(4)}
              </p>
            )}
          </div>
        </ScrollReveal>

        <div className="glass-panel rounded-2xl flex flex-col overflow-hidden min-h-[300px]">
          <div className="p-4 border-b border-slateCustom-800 flex items-center gap-2.5 shrink-0 bg-slateCustom-800/20">
            <MessageSquare className="h-5 w-5 text-brand-400" />
            <span className="font-bold text-sm text-slate-200">Messages</span>
            {loadingChat && <Loader2 className="h-4 w-4 animate-spin text-white/40 ml-auto" />}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slateCustom-900/40">
            {!loadingChat && messages.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No messages yet"
                description="Say hello to coordinate pickup with your driver and fellow passengers."
              />
            ) : (
              <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isMe = String(msg.senderId) === String(user._id);
                return (
                  <motion.div
                    key={msg._id}
                    layout
                    variants={messageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={messageTransition}
                    className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <span className="text-[9px] font-bold text-slate-400 mb-0.5 px-1">
                      {isMe ? 'You' : msg.senderName || 'Passenger'}
                    </span>
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed shadow ${
                        isMe
                          ? 'bg-brand-500 text-white rounded-tr-none'
                          : 'bg-slateCustom-800 text-slate-200 rounded-tl-none border border-slateCustom-700/60'
                      }`}
                    >
                      {msg.message}
                    </div>
                    <span className="text-[8px] text-slate-500 mt-0.5 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </motion.div>
                );
              })}
              </AnimatePresence>
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-slateCustom-800 shrink-0 bg-slateCustom-800/20 flex gap-2"
          >
            <input
              type="text"
              required
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Write a message…"
              className="flex-1 bg-slateCustom-800 border border-slateCustom-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <motion.button
              type="submit"
              disabled={sending}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={springGentle}
              className="h-8 w-8 rounded-lg bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center cursor-pointer transition-colors disabled:opacity-60"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
}
