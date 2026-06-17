import { env } from '@/config/env';
import { isDemoActive } from '@/config/demo';

export default function DemoModeBanner() {
  if (!env.demoMode && !isDemoActive()) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100">
      Portfolio demo — UI preview only. Data is mocked; connect a backend for full functionality.
    </div>
  );
}
