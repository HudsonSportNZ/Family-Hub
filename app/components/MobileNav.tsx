'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const navItems = [
  { id: 'tasks',    icon: '✅', label: 'Tasks',    href: '/tasks'  },
  { id: 'schedule', icon: '📅', label: 'Calendar', href: null      },
  { id: 'meals',    icon: '🍴', label: 'Food',     href: null      },
  { id: 'money',    icon: '💰', label: 'Money',    href: null      },
]

export default function MobileNav() {
  const pathname = usePathname()

  const getActiveId = () => {
    if (pathname === '/') return 'home'
    const match = navItems.find(item => item.href && item.href !== '/' && pathname.startsWith(item.href))
    return match?.id ?? 'home'
  }

  const activeId = getActiveId()

  return (
    <>
      <style>{`
        .mobile-bottom-bar {
          display: none;
        }

        @media (max-width: 768px) {
          .mobile-bottom-bar {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 64px;
            background: #13151C;
            border-top: 1px solid rgba(255,255,255,0.06);
            z-index: 100;
            align-items: center;
            justify-content: space-around;
            padding: 0 8px;
            padding-bottom: env(safe-area-inset-bottom);
          }

          .mobile-bottom-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            padding: 6px 12px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            flex: 1;
            text-decoration: none;
          }
          .mobile-bottom-nav-item.active {
            background: rgba(108,142,255,0.12);
          }
          .mobile-bottom-nav-icon {
            font-size: 20px;
            line-height: 1;
          }
          .mobile-bottom-nav-label {
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            color: rgba(240,242,248,0.35);
          }
          .mobile-bottom-nav-item.active .mobile-bottom-nav-label {
            color: #6C8EFF;
          }
        }
      `}</style>

      <nav className="mobile-bottom-bar">
        {navItems.map(item => {
          const isActive = activeId === item.id
          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
              >
                <div className="mobile-bottom-nav-icon">{item.icon}</div>
                <div className="mobile-bottom-nav-label">{item.label}</div>
              </Link>
            )
          }
          return (
            <div
              key={item.id}
              className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="mobile-bottom-nav-icon">{item.icon}</div>
              <div className="mobile-bottom-nav-label">{item.label}</div>
            </div>
          )
        })}
      </nav>
    </>
  )
}
