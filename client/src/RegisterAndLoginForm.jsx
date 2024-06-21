import { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "./UserContext.jsx";
import { Developer } from './Developer.jsx';

export default function RegisterAndLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginOrRegister, setIsLoginOrRegister] = useState('login');
  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);

  async function handleSubmit(ev) {
    ev.preventDefault();
    const url = isLoginOrRegister === 'register' ? 'register' : 'login';
    try {
      const { data } = await axios.post(url, { username, password });
      setLoggedInUsername(username);
      setId(data.id);
    } catch (error) {
      alert(error.response.data.error_message);
    }
  }

  return (
    <div className="relative">
      <div className="absolute top-0 z-[-2] h-screen w-screen bg-[#000000] bg-[radial-gradient(#ffffff33_1px,#00091d_1px)] bg-[size:20px_20px]"></div>
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-blue-600 font-bold flex gap-2 p-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
            <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
          </svg>
          GigaChat
        </div>
        <div className="bg-blue-50 rounded-lg p-8 flex flex-col items-center">
          <form className="w-64 mb-4" onSubmit={handleSubmit}>
            <input
              value={username}
              onChange={ev => setUsername(ev.target.value)}
              type="text"
              placeholder="Username"
              className="block w-full rounded-sm p-2 mb-2 border"
            />
            <input
              value={password}
              onChange={ev => setPassword(ev.target.value)}
              type="password"
              placeholder="Password"
              className="block w-full rounded-sm p-2 mb-2 border"
            />
            <button className="bg-blue-500 text-white block w-full rounded-sm p-2">
              {isLoginOrRegister === 'register' ? 'Register' : 'Login'}
            </button>
          </form>
          <div className="text-center">
            {isLoginOrRegister === 'register' ? (
              <p>
                Already a member?
                <button
                  className="ml-1 text-blue-500"
                  onClick={() => setIsLoginOrRegister('login')}
                >
                  Login here
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?
                <button
                  className="ml-1 text-blue-500"
                  onClick={() => setIsLoginOrRegister('register')}
                >
                  Register
                </button>
              </p>
            )}
          </div>
        </div>
        <Developer />
      </div>
    </div>
  );
}
