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
  { id: 'tasks',    icon: '✅', label: 'Tasks',    href: '/tasks'    },
  { id: 'schedule', icon: '📅', label: 'Calendar', href: '/calendar' },
  { id: 'meals',    icon: '🍴', label: 'Food',     href: null        },
  { id: 'money',    icon: '💰', label: 'Money',    href: null        },
  { id: 'chat',     icon: '💬', label: 'Chat',     href: '/chat'     },
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

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
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

  const navItems = currentUser?.role === 'kid'
    ? ALL_NAV_ITEMS.filter(item => item.id !== 'money')
    : ALL_NAV_ITEMS

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
            height: 64px;
            background: #13151C;
            border-top: 1px solid rgba(255,255,255,0.06);
            z-index: 100;
            align-items: center;
            justify-content: space-around;
            padding: 0 4px;
            padding-bottom: env(safe-area-inset-bottom);
          }

          .mobile-bottom-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            padding: 6px 8px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            flex: 1;
            text-decoration: none;
            position: relative;
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
          .nav-unread-badge {
            position: absolute;
            top: 3px;
            right: calc(50% - 20px);
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
                <div className="mobile-bottom-nav-icon">{item.icon}</div>
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
