const CACHE = 'furni-pro-v1';
const ASSETS = ['/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate', e => { e.waitUntil(clients.claim()); });

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});

// Daily check alarm simulation via periodic sync (if supported)
self.addEventListener('periodicsync', e => {
  if (e.tag === 'daily-check') {
    e.waitUntil(doCheck());
  }
});

async function doCheck() {
  const data = await getState();
  if (!data) return;
  const today = new Date(); today.setHours(0,0,0,0);

  const critInv = data.inventory.filter(i => i.qty === 0);
  const lowInv = data.inventory.filter(i => i.qty > 0 && i.qty <= i.min);
  const overdue = data.maintenance.filter(m => !m.done && new Date(m.date) < today);
  const todayM = data.maintenance.filter(m => {
    if (m.done) return false;
    const d = new Date(m.date); d.setHours(0,0,0,0);
    return d.getTime() === today.getTime();
  });

  const msgs = [];
  if (critInv.length) msgs.push(`🔴 ${critInv.length} أصناف نفدت من المخزون`);
  if (lowInv.length) msgs.push(`🟠 ${lowInv.length} أصناف على وشك النفاد`);
  if (overdue.length) msgs.push(`🔧 ${overdue.length} مهام صيانة متأخرة`);
  if (todayM.length) msgs.push(`📅 ${todayM.length} مهام صيانة اليوم`);

  if (msgs.length) {
    self.registration.showNotification('فروش برو — تنبيه يومي', {
      body: msgs.join('\n'),
      icon: '/icon-192.png',
      tag: 'daily',
      renotify: true,
      vibrate: [200, 100, 200, 100, 200]
    });
  }
}

async function getState() {
  try {
    const clients2 = await self.clients.matchAll();
    return null; // State is in localStorage, accessed via client messaging
  } catch { return null; }
}

self.addEventListener('message', e => {
  if (e.data?.type === 'CHECK') {
    // Manual check triggered from app
    const data = e.data.state;
    if (!data) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const critInv = data.inventory.filter(i => i.qty === 0);
    const lowInv = data.inventory.filter(i => i.qty > 0 && i.qty <= i.min);
    const overdue = data.maintenance.filter(m => !m.done && new Date(m.date) < today);
    const todayM = data.maintenance.filter(m => {
      if (m.done) return false;
      const d = new Date(m.date); d.setHours(0,0,0,0);
      return d.getTime() === today.getTime();
    });
    const msgs = [];
    if (critInv.length) msgs.push(`🔴 ${critInv.length} أصناف نفدت`);
    if (lowInv.length) msgs.push(`🟠 ${lowInv.length} منخفضة`);
    if (overdue.length) msgs.push(`🔧 ${overdue.length} صيانة متأخرة`);
    if (todayM.length) msgs.push(`📅 ${todayM.length} صيانة اليوم`);
    if (msgs.length && Notification.permission === 'granted') {
      self.registration.showNotification('فروش برو', {
        body: msgs.join(' • '),
        icon: '/icon-192.png',
        tag: 'check',
        renotify: true
      });
    }
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});
