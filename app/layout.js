import './globals.css';

export const metadata = { title: 'Perencana', description: 'Checklist dan jadwal untuk liburan, acara, atau kegiatan apa pun.' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=Figtree:wght@400;600&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
