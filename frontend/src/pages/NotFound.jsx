import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-bold text-indigo-600 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-slate-800 mb-2">
        Page Not Found
      </h2>
      <p className="text-slate-600 mb-6 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="px-6 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
      >
        Go Home
      </Link>
    </div>
  );
}
