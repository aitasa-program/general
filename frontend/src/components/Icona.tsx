type Nom = 'calendar' | 'clock' | 'box' | 'gauge' | 'list' | 'users' | 'car' | 'bell' | 'logout' | 'menu' | 'arrow' | 'back' | 'user' | 'file' | 'folder' | 'wrench' | 'sparkle' | 'note' | 'alert';
const paths: Record<Nom, string> = {
 wrench: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
 sparkle: 'M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1M12 8l1.2 2.8L16 12l-2.8 1.2L12 16l-1.2-2.8L8 12l2.8-1.2L12 8Z',
 note: 'M5 3h10l4 4v14H5V3Zm9 0v5h5M8 12h8M8 16h5M8 8h3',
 alert: 'M12 3 2 20h20L12 3Zm0 6v5M12 17h.01',
 file: 'M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8M8 16h8',
 folder: 'M3 6h6l2 2h10v12H3V6Zm0 0V4h7l2 2h7v2',
 calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM8 14h2M14 14h2M8 18h2',
 clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 box: 'm12 3 9 5v9l-9 5-9-5V8l9-5Zm-9 5 9 5 9-5M12 13v9M7 5.8l9 5',
 gauge: 'M4 19a10 10 0 1 1 16 0M12 12l5-5M6 12h1M12 5v1M17 12h1M9 19h6',
 list: 'M9 6h12M9 12h12M9 18h12M3 5h1v2H3zM3 11h1v2H3zM3 17h1v2H3z',
 users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.9M16 3a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 car: 'm5 6-2 7v6h3v-3h12v3h3v-6l-2-7H5ZM3 12h18M6 13v1M18 13v1',
 bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
 logout: 'M9 3H3v18h6M8 12h13m-4-4 4 4-4 4',
 menu: 'M4 6h16M4 12h16M4 18h16',
 arrow: 'm9 5 7 7-7 7', back: 'm15 5-7 7 7 7',
 user: 'M20 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
};
export default function Icona({ nom, size = 22 }: { nom: Nom; size?: number }) {
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[nom]} /></svg>;
}
