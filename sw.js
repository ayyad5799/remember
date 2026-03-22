const CACHE = 'mawaeedi-v1';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});

// ── Notification Scheduling ──
let scheduledTimers = [];

self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE') {
    scheduleAll(e.data.reminders || []);
  }
});

const DAY_MAP = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
const DAY_AR  = { sat:'السبت', sun:'الأحد', mon:'الاثنين', tue:'الثلاثاء', wed:'الأربعاء', thu:'الخميس', fri:'الجمعة' };

function scheduleAll(reminders) {
  scheduledTimers.forEach(clearTimeout);
  scheduledTimers = [];

  reminders.forEach(r => {
    const msUntilNext = getMsUntilNext(r);
    if (msUntilNext !== null) {
      const t = setTimeout(() => {
        self.registration.showNotification('⏰ ' + r.title, {
          body: r.note || 'وقت الموعد!',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: r.id,
          renotify: true,
          vibrate: [200, 100, 200]
        });
        // reschedule for next week
        scheduleAll(reminders);
      }, msUntilNext);
      scheduledTimers.push(t);
    }
  });
}

function getMsUntilNext(r) {
  const now = new Date();
  const [h, m] = r.time.split(':').map(Number);
  const days = r.days.includes('daily')
    ? [0,1,2,3,4,5,6]
    : r.days.map(d => DAY_MAP[d]).filter(x => x !== undefined);

  let min = Infinity;
  days.forEach(targetDay => {
    let diff = targetDay - now.getDay();
    if (diff < 0) diff += 7;
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + diff);
    candidate.setHours(h, m, 0, 0);
    if (candidate <= now) {
      candidate.setDate(candidate.getDate() + 7);
    }
    const ms = candidate - now;
    if (ms < min) min = ms;
  });

  return min === Infinity ? null : min;
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});
