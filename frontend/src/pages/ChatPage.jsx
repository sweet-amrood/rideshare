import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/context/SocketContext';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import { 
  ArrowLeft, 
  Send, 
  MapPin, 
  Navigation, 
  MessageSquare, 
  Bell, 
  Car, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export default function ChatPage() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = location.state?.from || '/carpooling';
  const { user } = useAuth();
  const socket = useSocket();
  
  const [rideDetails, setRideDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  
  // Coordinates mapping
  const [driverPos, setDriverPos] = useState({ lat: 24.9180, lng: 67.0681 }); // Defaults
  const [eta, setEta] = useState('8 mins');
  const [alerts, setAlerts] = useState('');

  // Scroll ref for chat
  const chatEndRef = useRef(null);

  // Simulation parameters for coordinate increments
  const simStepRef = useRef(0);
  const routePoints = [
    { lat: 24.9180, lng: 67.0681, eta: '8 mins' },
    { lat: 24.9088, lng: 67.0988, eta: '6 mins' },
    { lat: 24.8988, lng: 67.1432, eta: '4 mins' },
    { lat: 24.8722, lng: 67.2022, eta: '2 mins' },
    { lat: 24.8569, lng: 67.2644, eta: 'Arrived!' }
  ];

  useEffect(() => {
    fetchRideInfo();
  }, [rideId]);

  // Handle Socket.io registration
  useEffect(() => {
    if (!socket || !rideId) return;

    // Join room
    socket.emit('join-ride-room', { rideId, userId: user._id });

    // Listen for live movements
    socket.on('driver-moved', (coords) => {
      setDriverPos({ lat: coords.lat, lng: coords.lng });
      // Calculate basic ETA thresholds based on route arrays
      const matched = routePoints.find(p => Math.abs(p.lat - coords.lat) < 0.01);
      if (matched) {
        setEta(matched.eta);
        if (matched.eta === 'Arrived!') {
          setAlerts('Ding! Driver has arrived at your pick-up spot!');
        }
      }
    });

    // Listen for incoming messages
    socket.on('chat-msg-received', (msgObj) => {
      setMessages(prev => [...prev, msgObj]);
    });

    return () => {
      socket.off('driver-moved');
      socket.off('chat-msg-received');
    };
  }, [socket, rideId]);

  // Keep chat scrolled to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchRideInfo = async () => {
    try {
      const { data } = await api.get(endpoints.rides.byId(rideId));
      if (data.success) {
        setRideDetails(data.ride);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;

    socket.emit('chat-msg', {
      rideId,
      senderId: user._id,
      senderName: user.name,
      message: chatInput
    });

    setChatInput('');
  };

  // Simulates driver coordinates moving on the map and dispatches WebSocket events
  const handleSimulateMovement = () => {
    if (!socket) return;
    
    // Increment steps
    const nextIndex = (simStepRef.current + 1) % routePoints.length;
    simStepRef.current = nextIndex;
    const targetPoint = routePoints[nextIndex];

    // Emit live coords via WebSockets so all connected instances update
    socket.emit('update-location', {
      rideId,
      lat: targetPoint.lat,
      lng: targetPoint.lng,
      bearing: 45,
      speed: 40
    });

    // Also update local visual state for immediate feedback
    setDriverPos({ lat: targetPoint.lat, lng: targetPoint.lng });
    setEta(targetPoint.eta);
    if (targetPoint.eta === 'Arrived!') {
      setAlerts('Ding! Driver has arrived at your pick-up spot!');
    } else {
      setAlerts('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      
      {/* 1. Header Toolbar */}
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
              Ride Coordination: {rideDetails?.vehicleId?.make} {rideDetails?.vehicleId?.model}
            </h2>
            <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">
              {rideDetails?.origin?.address} ➔ {rideDetails?.destination?.address}
            </span>
          </div>
        </div>

        <button
          onClick={handleSimulateMovement}
          className="btn-primary w-full py-2.5"
        >
          Simulate GPS Move
        </button>
      </div>

      {alerts && (
        <div className="bg-green-500/10 border border-green-500/25 p-3 rounded-xl text-xs text-green-400 flex items-center gap-2.5 shrink-0">
          <Bell className="h-4.5 w-4.5 animate-bounce" />
          <span className="font-bold">{alerts}</span>
        </div>
      )}

      {/* 2. Main Tracking Panels */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
        
        {/* Left Map Viewport */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between overflow-hidden relative min-h-[300px]">
          <div className="absolute inset-0 bg-brand-950/15 opacity-40 bg-grid pointer-events-none"></div>
          
          <div className="flex justify-between items-center z-10">
            <span className="text-[10px] font-bold text-slate-400 bg-slateCustom-800 px-2 py-0.5 rounded-full border border-slateCustom-700 uppercase tracking-widest flex items-center gap-1">
              <MapPin className="h-3 w-3 text-brand-400" />
              <span>Live Visual SVG Map</span>
            </span>
            <span className="text-xs text-brand-300 font-bold bg-brand-500/15 px-3 py-1 rounded-lg">
              ETA: {eta}
            </span>
          </div>

          {/* Dynamic Vector Coordinate Route Map Mock */}
          <div className="flex-1 flex items-center justify-center relative pointer-events-none my-4">
            <svg className="absolute inset-0 h-full w-full opacity-35" xmlns="http://www.w3.org/2000/svg">
              {/* Route Trajectory Path line */}
              <path d="M 50 250 L 150 180 L 250 140 L 350 80 L 400 40" fill="none" stroke="#4f5ef4" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 4" />
              
              {/* Waypoints */}
              <circle cx="50" cy="250" r="6" fill="#4f5ef4" />
              <circle cx="400" cy="40" r="6" fill="#f44336" />
            </svg>

            {/* Simulated Live Moving Car icon representing coordinate states */}
            {/* The coordinate points map values between 0 and 100% based on simulated route lists */}
            <div 
              style={{
                position: 'absolute',
                left: `${12.5 + simStepRef.current * 20}%`,
                bottom: `${20 + simStepRef.current * 15}%`,
                transform: 'translate(-50%, 50%)',
                transition: 'all 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)'
              }}
              className="z-20 h-10 w-10 bg-brand-500 hover:bg-brand-600 rounded-full border-2 border-white flex items-center justify-center text-white shadow-xl shadow-brand-500/40"
            >
              <Car className="h-5.5 w-5.5 animate-pulse" />
            </div>

            <div className="absolute left-6 bottom-6 text-[10px] font-bold text-slate-400 bg-slateCustom-800/80 px-2 py-1 rounded border border-slateCustom-700/60">
              Pickup (Gulshan)
            </div>
            <div className="absolute right-6 top-6 text-[10px] font-bold text-slate-400 bg-slateCustom-800/80 px-2 py-1 rounded border border-slateCustom-700/60">
              Dropoff (FAST)
            </div>
          </div>

          <div className="z-10 bg-slateCustom-800/60 p-3 rounded-xl border border-slateCustom-700 text-[10px] text-slate-400 leading-relaxed flex items-start gap-2">
            <HelpCircle className="h-4 w-4 shrink-0 text-brand-400" />
            <span>
              Click the <strong>Simulate GPS Move</strong> button on the top right toolbar to dispatch coordinate shifts over WebSockets.
            </span>
          </div>
        </div>

        {/* Right Chat Interface Viewport */}
        <div className="glass-panel rounded-2xl flex flex-col overflow-hidden min-h-[300px]">
          {/* Header Title */}
          <div className="p-4 border-b border-slateCustom-800 flex items-center gap-2.5 shrink-0 bg-slateCustom-800/20">
            <MessageSquare className="h-5 w-5 text-brand-400" />
            <span className="font-bold text-sm text-slate-200">Trip Group Chat</span>
          </div>

          {/* Chat Messages Feed container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slateCustom-900/40">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-8">
                <p className="text-slate-500 text-xs max-w-xs leading-relaxed">
                  No message history yet. Text inside this feed to coordinate boarding guidelines with other carpool passengers.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId.toString() === user._id.toString();
                return (
                  <div key={msg._id} className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                    <span className="text-[9px] font-bold text-slate-400 mb-0.5 px-1">{msg.senderName}</span>
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow ${
                      isMe 
                        ? 'bg-brand-500 text-white rounded-tr-none' 
                        : 'bg-slateCustom-800 text-slate-200 rounded-tl-none border border-slateCustom-700/60'
                    }`}>
                      {msg.message}
                    </div>
                    <span className="text-[8px] text-slate-500 mt-0.5 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Messages Form Inputs */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slateCustom-800 shrink-0 bg-slateCustom-800/20 flex gap-2">
            <input
              type="text"
              required
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Write coordination message..."
              className="flex-1 bg-slateCustom-800 border border-slateCustom-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="h-8 w-8 rounded-lg bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
