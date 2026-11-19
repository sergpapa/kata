// The practice booking site for your first test run.
//
// It is a small web server that needs nothing but Node.js. It keeps its bookings in memory, so
// every start begins with all rooms free, and it listens only on this computer (127.0.0.1).
//
// Start it by hand with:   node site/server.mjs
// Option:                  --port 4410        the port to listen on
//
// This site has one defect planted on purpose. The lesson leads you to it.

import http from 'node:http';

const ROOMS = {
  harbour: { name: 'Harbour Room', ratePerHour: 12 },
  garden: { name: 'Garden Room', ratePerHour: 8 },
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const port = Number(option('port', '4410'));

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('The port must be a whole number from 1024 to 65535, for example 4410.');
  process.exit(1);
}

/** Bookings made since this server started: { id, roomKey, date, start, end }. */
const bookings = [];

function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · BookingLab practice site</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
  label { display: block; margin-top: 1rem; }
  input { font: inherit; padding: 0.3rem; }
  button { font: inherit; margin-top: 1.5rem; padding: 0.5rem 1rem; }
  .total { font-weight: bold; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function send(response, status, html) {
  response.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(html);
}

function roomsPage() {
  const items = Object.entries(ROOMS)
    .map(
      ([key, room]) =>
        `<li><a href="/rooms/${key}">${room.name}</a> <span>€${room.ratePerHour} per hour</span></li>`,
    )
    .join('\n');
  return page('Rooms', `<h1>Rooms</h1>\n<ul>\n${items}\n</ul>`);
}

function formPage(key, room) {
  return page(
    room.name,
    `<h1>${room.name}</h1>
<p>€${room.ratePerHour} per hour.</p>
<form method="post" action="/bookings">
  <input type="hidden" name="room" value="${key}">
  <label for="date">Date</label>
  <input id="date" name="date" type="date" required>
  <label for="start">Start time</label>
  <input id="start" name="start" type="time" required>
  <label for="end">End time</label>
  <input id="end" name="end" type="time" required>
  <div><button type="submit">Book this room</button></div>
</form>
<p><a href="/rooms">Back to all rooms</a></p>`,
  );
}

function minutes(time) {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

function displayDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function total(booking) {
  const room = ROOMS[booking.roomKey];
  const hours = (minutes(booking.end) - minutes(booking.start)) / 60;
  // The planted defect: the price is worked out and then thrown away.
  const price = hours * room.ratePerHour;
  return price * 0;
}

function confirmationPage(booking) {
  return page(
    'Booking confirmed',
    `<h1>Booking confirmed</h1>
<p>Room: ${ROOMS[booking.roomKey].name}</p>
<p>Date: ${displayDate(booking.date)}</p>
<p>Time: ${booking.start} to ${booking.end}</p>
<p class="total">Total: €${total(booking).toFixed(2)}</p>
<p><a href="/rooms">Back to all rooms</a></p>`,
  );
}

function refusalPage(heading, explanation) {
  return page(heading, `<h1>${heading}</h1>\n<p>${explanation}</p>\n<p><a href="/rooms">Back to all rooms</a></p>`);
}

function overlaps(a, b) {
  return a.roomKey === b.roomKey && a.date === b.date && minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end);
}

function readForm(request) {
  return new Promise((resolve, reject) => {
    let text = '';
    request.on('data', (chunk) => {
      text += chunk;
      if (text.length > 10_000) reject(new Error('The form is too large.'));
    });
    request.on('end', () => resolve(new URLSearchParams(text)));
    request.on('error', reject);
  });
}

async function createBooking(request, response) {
  const form = await readForm(request);
  const candidate = {
    roomKey: form.get('room') ?? '',
    date: form.get('date') ?? '',
    start: form.get('start') ?? '',
    end: form.get('end') ?? '',
  };

  const wellFormed =
    ROOMS[candidate.roomKey] !== undefined &&
    /^\d{4}-\d{2}-\d{2}$/.test(candidate.date) &&
    /^\d{2}:\d{2}$/.test(candidate.start) &&
    /^\d{2}:\d{2}$/.test(candidate.end);
  if (!wellFormed || minutes(candidate.end) <= minutes(candidate.start)) {
    send(response, 400, refusalPage('Check your booking', 'Choose a room, a date, and an end time after the start time.'));
    return;
  }

  if (bookings.some((existing) => overlaps(existing, candidate))) {
    send(response, 409, refusalPage('This room is already booked', 'Somebody has this room for at least part of that time.'));
    return;
  }

  const booking = { id: bookings.length + 1, ...candidate };
  bookings.push(booking);
  response.writeHead(303, { Location: `/bookings/${booking.id}` });
  response.end();
}

const server = http.createServer((request, response) => {
  const { pathname } = new URL(request.url, `http://127.0.0.1:${port}`);

  // Browsers ask for a small icon to show on the tab. This site has none, and the request is
  // left out of the log so that the log shows only the pages you asked for.
  if (pathname === '/favicon.ico') {
    response.writeHead(204);
    response.end();
    return;
  }
  console.log(`${request.method} ${pathname}`);

  if (request.method === 'GET' && pathname === '/') {
    response.writeHead(302, { Location: '/rooms' });
    response.end();
    return;
  }
  if (request.method === 'GET' && pathname === '/rooms') {
    send(response, 200, roomsPage());
    return;
  }
  const roomMatch = /^\/rooms\/([a-z]+)$/.exec(pathname);
  if (request.method === 'GET' && roomMatch && ROOMS[roomMatch[1]]) {
    send(response, 200, formPage(roomMatch[1], ROOMS[roomMatch[1]]));
    return;
  }
  if (request.method === 'POST' && pathname === '/bookings') {
    createBooking(request, response).catch(() => {
      send(response, 400, refusalPage('Check your booking', 'The booking form could not be read.'));
    });
    return;
  }
  const bookingMatch = /^\/bookings\/(\d+)$/.exec(pathname);
  const booking = bookingMatch ? bookings.find((item) => item.id === Number(bookingMatch[1])) : undefined;
  if (request.method === 'GET' && booking) {
    send(response, 200, confirmationPage(booking));
    return;
  }
  send(response, 404, refusalPage('Page not found', 'This site has no page at that address.'));
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Another copy of the site is probably still running.`);
    console.error('Find the terminal where it runs and press Ctrl+C there, then start this one again.');
  } else {
    console.error(`The site could not start: ${error.message}`);
  }
  process.exit(1);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`BookingLab practice site is listening at http://127.0.0.1:${port}/rooms`);
  console.log('Press Ctrl+C in this terminal to stop it.');
});
