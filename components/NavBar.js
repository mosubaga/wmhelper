import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/calculator/', label: 'Calculator' },
  { href: '/plot2d/', label: '2D Plot' },
  { href: '/plot3d/', label: '3D Plot' },
  { href: '/matrix/', label: 'Matrix' },
  { href: '/applications/', label: 'Applications' },
  { href: '/latex/', label: 'LaTeX' },
  { href: '/stats/', label: 'Statistics' },
];

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const isActive = (href) => {
    if (href === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(href.replace(/\/$/, ''));
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand">
          <span>MathHelper</span>
        </Link>

        <button
          className="navbar-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navbar-links ${isOpen ? 'open' : ''}`}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`navbar-link ${isActive(link.href) ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
