import React from 'react';
import DevImage from './assets/PPicture.jpeg';

export function Developer() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="relative h-[400px] w-[300px] rounded-md flex flex-wrap">
        <img
          src={DevImage}
          alt="AirMax Pro"
          className="z-0 h-50 w-50 rounded-md object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
        <div className="absolute bottom-4 left-4 text-left">
          <h1 className="text-lg font-semibold text-white">Abhilash</h1>
          <p className="mt-2 text-sm text-gray-300">
            Javascript developer with expertise in MERN stack.
          </p>
          <a href="https://www.linkedin.com/in/abhilash-lenin-kachhap-256876196/" className="mt-2 inline-flex cursor-pointer items-center text-sm font-semibold text-white">
            View Profile &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
