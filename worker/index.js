// Custom service worker extensions — push notifications
// next-pwa bundles this file and imports it into sw.js automatically

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Hudson Family', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Hudson Family', {
      body: data.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: data.tag || 'chat-message',
      renotify: true,
      data: { url: data.url || '/chat' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = (event.notification.data && event.notification.data.url) || '/chat'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl)
            return client.focus()
          }
        }
        return self.clients.openWindow(targetUrl)
      })
  )
})
