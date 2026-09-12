import { Link } from 'react-router-dom';
import { FiCompass, FiArrowLeft } from 'react-icons/fi';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[75vh] w-full flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
      <div className="flex h-14 w-14 items-center justify-center rounded-[8px] bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset mb-2">
        <FiCompass className="h-7 w-7" />
      </div>
      <span className="mt-4 text-xs font-semibold uppercase tracking-widest text-[#5f5f5d]">404 Error</span>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1c1c1c] sm:text-4xl">
        Page Not Found
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#5f5f5d]">
        The page you are looking for does not exist, has been removed, or is temporarily unavailable.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link to="/dashboard">
          <Button size="sm" className="gap-2 font-normal">
            <FiArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
