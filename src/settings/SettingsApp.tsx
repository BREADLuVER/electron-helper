import * as Tabs from '@radix-ui/react-tabs';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function AccountTab() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sess = supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const sendMagicLink = async () => {
    const email = prompt('Enter your email');
    if (email) {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) alert(error.message);
      else alert('Check your inbox for a sign-in link.');
    }
  };

  if (loading) return <p className="p-4">Loading…</p>;

  return (
    <div className="p-4 space-y-4">
      {user ? (
        <>
          <p>Signed in as <strong>{user.email}</strong></p>
          <button className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </>
      ) : (
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={sendMagicLink}>Sign in with magic link</button>
      )}
    </div>
  );
}

export default function SettingsApp() {
  return (
    <Tabs.Root defaultValue="account" className="w-full h-full flex">
      <Tabs.List className="flex flex-col w-40 border-r border-gray-200 dark:border-gray-700">
        <Tabs.Trigger value="account" className="px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800">Account</Tabs.Trigger>
        <Tabs.Trigger value="behaviour" className="px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800">Behaviour</Tabs.Trigger>
        <Tabs.Trigger value="docs" className="px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800">Reference Docs</Tabs.Trigger>
        <Tabs.Trigger value="billing" className="px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800">Billing</Tabs.Trigger>
      </Tabs.List>
      <div className="flex-1 overflow-auto">
        <Tabs.Content value="account"><AccountTab /></Tabs.Content>
        <Tabs.Content value="behaviour"><div className="p-4">Behaviour editor coming soon…</div></Tabs.Content>
        <Tabs.Content value="docs"><div className="p-4">Upload docs coming soon…</div></Tabs.Content>
        <Tabs.Content value="billing"><div className="p-4">Billing info coming soon…</div></Tabs.Content>
      </div>
    </Tabs.Root>
  );
} 