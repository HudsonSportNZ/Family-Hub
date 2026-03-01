'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ALL_NAV_ITEMS = [
  { id: 'home',      icon: null,  label: 'Home',     href: '/'          },
  { id: 'tasks',     icon: '✅',  label: 'To Do',    href: '/tasks'     },
  { id: 'schedule',  icon: '📅',  label: 'Calendar', href: '/calendar'  },
  { id: 'groceries', icon: '🛒',  label: 'Lists',    href: '/groceries' },
  { id: 'chat',      icon: '💬',  label: 'Chat',     href: '/chat'      },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null)
  const [chatUnread, setChatUnread] = useState(0)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('familyUser')
      if (stored) setCurrentUser(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  // Fetch + subscribe to unread message count
  useEffect(() => {
    if (!currentUser) return

    const ALL_NAMES = ['Mum', 'Dad', 'Isabel', 'James']
    const others = ALL_NAMES.filter(n => n !== currentUser.name)
    const threadIds = [
      'family',
      ...others.map(n => [currentUser.name, n].map(x => x.toLowerCase()).sort().join('-')),
    ]

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('thread_id', threadIds)
        .neq('sender', currentUser.name)
        .not('read_by', 'cs', `{${currentUser.name}}`)
      setChatUnread(count ?? 0)
    }

    fetchUnread()

    const channel = supabase
      .channel('nav-unread-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchUnread)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUser])

  // Hide on individual thread pages — MessageThread takes over full screen
  if (pathname?.startsWith('/chat/')) return null

  const navItems = ALL_NAV_ITEMS

  const getActiveId = () => {
    if (pathname === '/') return 'home'
    const match = navItems.find(item => item.href && item.href !== '/' && pathname?.startsWith(item.href))
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
            height: calc(64px + env(safe-area-inset-bottom));
            background: #13151C;
            border-top: 1px solid rgba(255,255,255,0.06);
            z-index: 100;
            align-items: center;
            justify-content: space-around;
            padding: 0 6px;
            padding-bottom: env(safe-area-inset-bottom);
          }

          .mobile-bottom-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            padding: 6px 2px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            flex: 1;
            text-decoration: none;
            position: relative;
            min-width: 0;
          }
          .mobile-bottom-nav-item.active {
            background: rgba(108,142,255,0.12);
          }
          .mobile-bottom-nav-icon {
            font-size: 19px;
            line-height: 1;
          }
          .mobile-bottom-nav-home-logo {
            width: 26px;
            height: 26px;
            border-radius: 7px;
            display: block;
            object-fit: cover;
            opacity: 0.6;
            transition: opacity 0.2s;
          }
          .mobile-bottom-nav-item.active .mobile-bottom-nav-home-logo {
            opacity: 1;
          }
          .mobile-bottom-nav-label {
            font-size: 8.5px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.2px;
            color: rgba(240,242,248,0.35);
            white-space: nowrap;
          }
          .mobile-bottom-nav-item.active .mobile-bottom-nav-label {
            color: #6C8EFF;
          }
          .nav-unread-badge {
            position: absolute;
            top: 2px;
            left: 50%;
            transform: translateX(4px);
            min-width: 17px;
            height: 17px;
            border-radius: 9px;
            background: #F87171;
            color: white;
            font-size: 10px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
            border: 2px solid #13151C;
            line-height: 1;
          }
        }
      `}</style>

      <nav className="mobile-bottom-bar">
        {navItems.map(item => {
          const isActive = activeId === item.id
          const showBadge = item.id === 'chat' && chatUnread > 0

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
              >
                {item.id === 'home'
                  ? <img src="/icons/apple-touch-icon.png" className="mobile-bottom-nav-home-logo" alt="Home" />
                  : <div className="mobile-bottom-nav-icon">{item.icon}</div>
                }
                <div className="mobile-bottom-nav-label">{item.label}</div>
                {showBadge && (
                  <div className="nav-unread-badge">
                    {chatUnread > 99 ? '99+' : chatUnread}
                  </div>
                )}
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
