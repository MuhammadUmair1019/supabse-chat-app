

import './App.css'
import { supabase } from './config/supabse';
import { useEffect, useState, useRef } from 'react';

function App() {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      console.log(error);
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    supabase
      .from("messages1")
      .select("*")
      .order("created_at")
      .then(({ data }) => setMessages(data));

    const channel = supabase
      .channel("chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages1" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();

    await supabase.from("messages1").insert({
      content: messageInput,
      user_email: session?.user?.email,
      user_id: session.user?.id
    });

    setMessageInput("");
  };

  console.log("message", messages)

  if (!session) {
    return (
      <div className='w-full h-screen flex items-center justify-center'>
        <button className='bg-blue-500 text-white px-4 py-2 rounded-md cursor-pointer' onClick={signInWithGoogle}>Sign in with Google</button>
      </div>
    )
  }

  return (
    <div className='w-full h-screen flex items-center justify-center'>
      <div className='border border-gray-500 min-w-6xl w-full min-h-[600px] rounded-lg'>
        {/* header */}
        <div className='flex items-center justify-between mb-4 border-b border-gray-500 p-4'>
          <div>
            <p>Sign as {session.user.user_metadata.name || 'Guest'}</p>
          </div>
          <div>
            <button className='text-white px-4 py-2 rounded-md' onClick={signOut}>Logout</button>
          </div>
        </div>
        {/* main chat  */}
        <div className='flex flex-col overflow-y-auto h-[500px] p-4 gap-3'>
          {messages.map((m) => (
            <div key={m.id} className={`flex items-start   gap-3 ${m?.user_id !== session?.user?.id
              ? "justify-end"
              : "justify-start"
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                {m.user_email[0].toUpperCase()}
              </div>

              {/* Message content */}
              <div className="bg-gray-100 p-2 rounded-lg flex flex-col">
                <div className="text-gray-800">{m.content}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} className='h-10' />
        </div>

        {/* message input */}
        <form onSubmit={sendMessage} className='flex items-center gap-2 border-t border-gray-500 p-4'>
          <input value={messageInput} onChange={(e) => setMessageInput(e.target.value)} type="text" placeholder='Message' className='w-full bg-gray-800 p-2 rounded-md' />
          <button type='submit' className='bg-blue-500 text-white px-4 py-2 rounded-md cursor-pointer'>Send</button>
        </form>
      </div>
    </div>
  )
}

export default App
