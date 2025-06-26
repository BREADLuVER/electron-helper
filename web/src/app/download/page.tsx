export default function Download() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <h1 className="text-3xl font-bold">Download PrepDock</h1>
      <p>Installers coming soon—choose your platform to grab a preview build.</p>
      <div className="grid sm:grid-cols-3 gap-6">
        <a href="https://example.com/PrepDock-win.zip" className="rounded-lg bg-black text-white px-6 py-4 text-center hover:bg-neutral-800 transition-colors">Windows</a>
        <a href="https://example.com/PrepDock-mac.dmg" className="rounded-lg bg-black text-white px-6 py-4 text-center hover:bg-neutral-800 transition-colors">macOS</a>
        <a href="https://example.com/PrepDock-linux.AppImage" className="rounded-lg bg-black text-white px-6 py-4 text-center hover:bg-neutral-800 transition-colors">Linux</a>
      </div>
    </div>
  );
} 