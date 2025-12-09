// src/components/Footer.jsx
export default function Footer() {
  return (
    <footer className="mt-12 bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="text-xl font-bold text-white">Porter Clone</div>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              A smart logistics dashboard for bookings, fleet tracking and
              delivery management.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <div className="text-sm font-semibold text-white mb-3">
              Quick links
            </div>
            <ul className="text-sm space-y-2">
              <li>
                <a href="/booking" className="hover:text-white">
                  Create booking
                </a>
              </li>
              <li>
                <a href="/tracking" className="hover:text-white">
                  Track order
                </a>
              </li>
              <li>
                <a href="/fleet" className="hover:text-white">
                  Fleet dashboard
                </a>
              </li>
              <li>
                <a href="/profile" className="hover:text-white">
                  My profile
                </a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <div className="text-sm font-semibold text-white mb-3">Social</div>
            <ul className="text-sm space-y-2">
              <li>
                <a href="#" className="hover:text-white">
                  LinkedIn
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Twitter
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-700 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Porter Clone — All rights reserved.
        </div>
      </div>
    </footer>
  );
}
