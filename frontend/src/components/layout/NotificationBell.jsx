import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellRing,
  Car,
  Check,
  CheckCheck,
  Loader2,
  MapPin,
  Play,
  UserPlus,
  X,
  XCircle
} from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import {
  formatNotificationTime,
  getNotificationPath,
  notificationIconType
} from '@/utils/notificationRoutes';
import AnimatedBadge from '@/components/animations/AnimatedBadge';
import EmptyState from '@/components/animations/EmptyState';
import { StaggerList, StaggerItem } from '@/components/animations/StaggerList';
import {
  notificationItemVariants,
  notificationPanelTransition,
  notificationPanelVariants
} from '@/animations/notificationVariants';
import { iconButtonMotion } from '@/animations/buttonVariants';

const ICONS = {
  new: UserPlus,
  start: Play,
  complete: Check,
  cancel: XCircle,
  confirm: Car,
  info: MapPin
};

const panelShell = {
  position: 'fixed',
  zIndex: 100000,
  width: 'min(360px, calc(100vw - 16px))',
  maxHeight: 'min(70vh, 420px)',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(10, 14, 24, 0.98)',
  backdropFilter: 'blur(24px)',
  boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
  color: '#f8fafc',
  fontFamily: "'Outfit', 'Inter', sans-serif",
  overflow: 'hidden'
};

function NotificationRow({ item, onOpen }) {
  const iconKey = notificationIconType(item.type);
  const Icon = ICONS[iconKey] || Bell;

  return (
    <StaggerItem layout>
      <motion.button
        type="button"
        onClick={() => onOpen(item)}
        variants={notificationItemVariants}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: '100%',
          display: 'flex',
          gap: '12px',
          padding: '10px 12px',
          borderRadius: '12px',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          background: item.read ? 'transparent' : 'rgba(79,94,244,0.1)',
          color: '#f8fafc'
        }}
      >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background:
            iconKey === 'cancel'
              ? 'rgba(239,68,68,0.15)'
              : iconKey === 'start'
                ? 'rgba(16,185,129,0.15)'
                : 'rgba(79,94,244,0.15)'
        }}
      >
        <Icon size={16} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: item.read ? 'rgba(255,255,255,0.75)' : '#fff' }}>
          {item.title}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
          {item.body}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
          {formatNotificationTime(item.createdAt)}
        </p>
      </div>
      </motion.button>
    </StaggerItem>
  );
}

export default function NotificationBell({ className = '' }) {
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const { items, unreadCount, loading, refresh, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 56, right: 16 });

  const updatePanelPos = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setPanelPos({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right)
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPos();
  }, [open, updatePanelPos]);

  useEffect(() => {
    if (!open) return undefined;
    const onResize = () => updatePanelPos();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, updatePanelPos]);

  // Defer outside-click so the opening click does not instantly close the panel
  useEffect(() => {
    if (!open) return undefined;
    let removeListener = null;
    const timer = window.setTimeout(() => {
      const onDocClick = (e) => {
        const target = e.target;
        if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
        setOpen(false);
      };
      document.addEventListener('click', onDocClick);
      removeListener = () => document.removeEventListener('click', onDocClick);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      removeListener?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const handleOpenItem = async (item) => {
    if (!item.read) await markRead(item._id);
    setOpen(false);
    navigate(getNotificationPath(item));
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!open) {
      updatePanelPos();
      refresh();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const panel =
    typeof document !== 'undefined' &&
    createPortal(
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="notif-backdrop"
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: 'rgba(0,0,0,0.2)'
              }}
            />
            <motion.div
              key="notif-panel"
              ref={panelRef}
              role="dialog"
              aria-label="Notifications"
              variants={notificationPanelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={notificationPanelTransition}
              style={{
                ...panelShell,
                top: panelPos.top,
                right: panelPos.right
              }}
            >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Notifications</p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                Rides, bookings & updates
              </p>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  title="Mark all read"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    padding: 6,
                    borderRadius: 8
                  }}
                >
                  <CheckCheck size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 8
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div style={{ overflowY: 'auto', padding: 8, flex: 1 }}>
            {loading && items.length === 0 ? (
              <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center', color: '#a3b5fc' }}>
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No notifications yet"
                description="Ride updates and booking alerts will appear here."
              />
            ) : (
              <StaggerList>
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <NotificationRow key={item._id} item={item} onOpen={handleOpenItem} />
                  ))}
                </AnimatePresence>
              </StaggerList>
            )}
          </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );

  return (
    <>
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        whileHover={iconButtonMotion.hover}
        whileTap={iconButtonMotion.tap}
        transition={iconButtonMotion.spring}
        className={`relative flex items-center justify-center h-9 w-9 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer ${className}`}
        aria-label="Notifications"
        aria-expanded={open}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-4 w-4 text-brand-300" />
        ) : (
          <Bell className="h-4 w-4 text-white/65" />
        )}
        <AnimatedBadge count={unreadCount} />
      </motion.button>
      {panel}
    </>
  );
}
