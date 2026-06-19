import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAppSocket } from '@/hooks/useAppSocket';
import { rideRequestService } from '@/api/services/rideRequest.service';
import ChatMessageStatus from '@/components/chat/ChatMessageStatus';

const formatTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function RideRequestChatPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [otherName, setOtherName] = useState('Rider');
  const [otherRole, setOtherRole] = useState('');
  const [typingName, setTypingName] = useState('');
  const endRef = useRef(null);
  const typingTimerRef = useRef(null);
  const lastTypingEmitRef = useRef(0);

  const mergeMessage = useCallback((msg) => {
    setMessages((prev) => {
      const mine = String(msg.senderId) === String(user._id);
      const normalized = {
        ...msg,
        isMine: msg.isMine ?? mine,
        status: mine ? msg.status || 'sent' : undefined
      };
      const idx = prev.findIndex((m) => m._id === normalized._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...normalized };
        return next;
      }
      return [...prev, normalized];
    });
  }, [user._id]);

  const { getSocket, joinRideRequestRoom } = useAppSocket({
    'ride-request:chat': (msg) => {
      if (String(msg.rideRequestId) !== String(requestId)) return;
      const mine = String(msg.senderId) === String(user._id);
      if (mine) {
        setMessages((prev) => {
          const filtered = prev.filter(
            (m) => !(String(m._id).startsWith('temp-') && m.message === msg.message)
          );
          if (filtered.some((m) => m._id === msg._id)) {
            return filtered.map((m) => (m._id === msg._id ? { ...m, ...msg, isMine: true, status: 'sent' } : m));
          }
          return [...filtered, { ...msg, isMine: true, status: 'sent' }];
        });
      } else {
        mergeMessage(msg);
        getSocket()?.emit('ride-request-chat-delivered', { messageId: msg._id });
        rideRequestService.markChatRead(requestId).catch(() => {});
      }
    },
    'ride-request:chat-status': (p) => {
      if (String(p.rideRequestId) !== String(requestId) && !p.messageId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === p.messageId && m.isMine ? { ...m, status: p.status } : m
        )
      );
    },
    'ride-request:chat-read': (p) => {
      if (String(p.requestId) !== String(requestId)) return;
      setMessages((prev) =>
        prev.map((m) => (m.isMine ? { ...m, status: 'read' } : m))
      );
    },
    'ride-request:chat-typing': (p) => {
      if (String(p.requestId) !== String(requestId)) return;
      if (String(p.userId) === String(user._id)) return;
      setTypingName(p.senderName || otherName);
    },
    'ride-request:chat-stop-typing': (p) => {
      if (String(p.requestId) !== String(requestId)) return;
      if (String(p.userId) === String(user._id)) return;
      setTypingName('');
    },
    'socket-error': (p) => {
      if (p?.message) toast.error(p.message);
    }
  });

  const markRead = useCallback(() => {
    if (!requestId) return;
    rideRequestService.markChatRead(requestId).catch(() => {});
    getSocket()?.emit('ride-request-chat-read', { requestId });
  }, [requestId, getSocket]);

  useEffect(() => {
    if (!requestId) return;
    rideRequestService.getChat(requestId).then((res) => {
      if (res.success) setMessages(res.data?.messages || []);
    });
    markRead();
    rideRequestService.get(requestId).then((res) => {
      if (!res.success || !res.data?.request) return;
      const r = res.data.request;
      const isPassenger = String(r.passengerId?._id || r.passengerId) === String(user._id);
      if (isPassenger) {
        setOtherName(r.acceptedDriverId?.name || 'Driver');
        setOtherRole('Driver');
      } else {
        setOtherName(r.passengerId?.name || 'Passenger');
        setOtherRole('Passenger');
      }
    });
  }, [requestId, user._id, markRead]);

  useEffect(() => {
    if (requestId) joinRideRequestRoom(requestId);
  }, [requestId, joinRideRequestRoom]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const onConnect = () => joinRideRequestRoom(requestId);
    socket.on('connect', onConnect);
    return () => socket.off('connect', onConnect);
  }, [requestId, joinRideRequestRoom, getSocket]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const emitStopTyping = useCallback(() => {
    getSocket()?.emit('ride-request-chat-stop-typing', { requestId });
  }, [requestId, getSocket]);

  const onInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    const socket = getSocket();
    if (!socket?.connected || !val.trim()) {
      emitStopTyping();
      return;
    }
    const now = Date.now();
    if (now - lastTypingEmitRef.current > 1200) {
      lastTypingEmitRef.current = now;
      socket.emit('ride-request-chat-typing', { requestId, senderName: user.name });
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(emitStopTyping, 2000);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      _id: tempId,
      rideRequestId: requestId,
      senderId: user._id,
      senderName: user.name,
      message: text,
      createdAt: new Date().toISOString(),
      status: 'sent',
      isMine: true
    };
    mergeMessage(optimistic);
    setInput('');
    emitStopTyping();
    setSending(true);
    try {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('ride-request-chat', { requestId, senderName: user.name, message: text });
        return;
      }
      const res = await rideRequestService.sendChat(requestId, text);
      if (res.success) {
        setMessages((prev) =>
          prev.filter((m) => m._id !== tempId).concat({ ...res.data, isMine: true, status: 'sent' })
        );
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      toast.error(err.response?.data?.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-6rem)]">
      <header className="flex items-center gap-3 pb-3 border-b border-slateCustom-700/80 mb-0 shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-slateCustom-800 text-brand-400 border-0 cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-10 w-10 rounded-full bg-brand-500/30 flex items-center justify-center text-brand-200 font-bold shrink-0">
          {otherName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-white truncate">{otherName}</h1>
          <p className="text-xs text-white/50 truncate">
            {typingName ? (
              <span className="text-emerald-400">{typingName} is typing…</span>
            ) : (
              `${otherRole || 'Ride'} chat`
            )}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
        {messages.map((m) => {
          const mine = m.isMine ?? String(m.senderId) === String(user._id);
          const displayName = mine ? user.name || 'You' : m.senderName || otherName;
          return (
            <div key={m._id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <p
                className={`text-[11px] font-semibold mb-1 px-1 ${
                  mine ? 'text-brand-300/90' : 'text-white/55'
                }`}
              >
                {displayName}
              </p>
              <div
                className={`max-w-[88%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                  mine
                    ? 'bg-brand-500 text-white rounded-br-md'
                    : 'bg-slateCustom-800 text-white/95 rounded-bl-md border border-slateCustom-700'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.message}</p>
                <div
                  className={`flex items-center gap-1.5 mt-1 ${
                    mine ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <span className={`text-[10px] ${mine ? 'text-white/70' : 'text-white/45'}`}>
                    {formatTime(m.createdAt)}
                  </span>
                  {mine && <ChatMessageStatus status={m.status} />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        className="shrink-0 flex gap-2 pt-3 border-t border-slateCustom-700/80"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          className="flex-1 bg-slateCustom-800 border border-slateCustom-600 rounded-full px-4 py-2.5 text-white text-sm"
          value={input}
          onChange={onInputChange}
          onBlur={emitStopTyping}
          placeholder="Type a message…"
        />
        <button
          type="submit"
          disabled={sending}
          className="h-11 w-11 flex items-center justify-center rounded-full bg-brand-500 text-white border-0 disabled:opacity-50 shrink-0"
          aria-label="Send"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
