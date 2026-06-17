/** WhatsApp-style ticks: sent ✓, delivered ✓✓, read ✓✓ (blue) */
export default function ChatMessageStatus({ status }) {
  if (!status || status === 'sent') {
    return <span className="text-white/50 text-[11px] leading-none" aria-label="Sent">✓</span>;
  }
  if (status === 'delivered') {
    return <span className="text-white/60 text-[11px] leading-none" aria-label="Delivered">✓✓</span>;
  }
  if (status === 'read') {
    return <span className="text-sky-300 text-[11px] leading-none" aria-label="Seen">✓✓</span>;
  }
  return null;
}
