import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DISCORD_INVITE = 'https://discord.gg/MZzEyX3peN';

const CountdownPage = () => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const targetDate = new Date('2025-06-21T15:00:00+02:00').getTime();
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-mono relative overflow-hidden flex flex-col justify-center items-center px-4">
      {/* Code/terminal style header overlay */}
      <div className="absolute top-0 left-0 w-full px-4 pt-8 z-10 select-none pointer-events-none">
        <div className="text-sm md:text-lg lg:text-2xl text-gray-400 tracking-tight">
          <span className="text-gray-600">function</span> <span className="text-red-500 font-bold">Countdown</span><span className="text-white">(&#123;&#125;)</span> <span className="text-gray-600">&#123;</span>
        </div>
      </div>

      {/* Subtle grid/code background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />

      {/* Main Content - No Card Container */}
      <div className="relative z-20 w-full max-w-xl flex flex-col items-center mt-24 md:mt-32 mb-8">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center mb-2 tracking-tight bg-gradient-to-r from-red-500 to-white bg-clip-text text-transparent uppercase">BODAX MASTERS</h1>
        <div className="text-center text-gray-400 mb-6 md:mb-8 text-base md:text-lg">The ultimate Valorant tournament experience</div>
        
        {/* Event Details Section */}
        <div className="w-full flex flex-col md:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="flex-1 bg-black/60 border border-gray-700 rounded-lg p-3 md:p-4">
            <div className="text-red-400 font-bold text-xs md:text-sm mb-1">QUALIFIER</div>
            <div className="text-gray-200 text-xs mb-1">32 Teams · Double Elim · BO1</div>
            <div className="text-gray-400 text-xs mb-1">19th & 20th July</div>
            <div className="text-gray-400 text-xs">Top 4 advance to Finals</div>
          </div>
          <div className="flex-1 bg-black/60 border border-gray-700 rounded-lg p-3 md:p-4">
            <div className="text-red-400 font-bold text-xs md:text-sm mb-1">FINALS</div>
            <div className="text-gray-200 text-xs mb-1">8 Teams (4 Invited, 4 Qual.)</div>
            <div className="text-gray-400 text-xs mb-1">Single Elim · BO1</div>
            <div className="text-gray-400 text-xs mb-1">26th July</div>
            <div className="text-gray-400 text-xs">€300 Prize Pool</div>
          </div>
        </div>
        
        {/* Countdown Section */}
        <div className="w-full flex flex-col items-center mb-6 md:mb-8">
          <div className="text-center text-gray-300 text-base md:text-lg mb-2">Registration Opens In</div>
          <div className="flex gap-2 md:gap-4 justify-center items-center">
            {[{ value: timeLeft.days, label: 'DAYS' }, { value: timeLeft.hours, label: 'HRS' }, { value: timeLeft.minutes, label: 'MIN' }, { value: timeLeft.seconds, label: 'SEC' }].map((item, i) => (
              <div key={i} className="flex flex-col items-center bg-black/60 border border-gray-700 rounded-lg px-2 md:px-4 py-2 mx-0.5 md:mx-1 shadow-md">
                <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-red-500 tabular-nums">{item.value.toString().padStart(2, '0')}</span>
                <span className="text-xs text-gray-400 tracking-widest mt-1">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-3">June 21st, 2025 // 3:00 PM CEST</div>
        </div>
        
        {/* Prize Pool Section */}
        <div className="w-full flex flex-col items-center mb-6 md:mb-8">
          <div className="text-gray-400 text-sm mb-2">Prize Pool</div>
          <div className="text-xl md:text-2xl font-bold text-red-500 mb-2">€300</div>
          <div className="text-gray-400 text-xs">Finals Only · Winner Takes All</div>
        </div>
      </div>

      {/* Invited Teams Section */}
      <div className="relative z-20 w-full max-w-xl flex flex-col items-center mb-8">
        <div className="text-gray-400 text-sm mb-4">Invited Teams</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 justify-items-center">
          <div className="flex flex-col items-center">
            <img src="/logos/nxt-logo.png" alt="NXT DACH" className="h-12 w-12 md:h-16 md:w-16 object-contain mb-2 bg-black rounded-lg border border-gray-700 p-1 md:p-2" />
            <span className="text-xs md:text-sm text-gray-300 text-center">NXT DACH</span>
          </div>
          <div className="flex flex-col items-center">
            <img src="/logos/nxt-uk.png" alt="NXT UK" className="h-12 w-12 md:h-16 md:w-16 object-contain mb-2 bg-black rounded-lg border border-gray-700 p-1 md:p-2" />
            <span className="text-xs md:text-sm text-gray-300 text-center">NXT UK</span>
          </div>
          <div className="flex flex-col items-center">
            <img src="/logos/rizon-logo.png" alt="RIZON DACH" className="h-12 w-12 md:h-16 md:w-16 object-contain mb-2 bg-black rounded-lg border border-gray-700 p-1 md:p-2" />
            <span className="text-xs md:text-sm text-gray-300 text-center">RIZON DACH</span>
          </div>
          <div className="flex flex-col items-center">
            <img src="/logos/lp-logo.png" alt="Lost Puppies UK" className="h-12 w-12 md:h-16 md:w-16 object-contain mb-2 bg-black rounded-lg border border-gray-700 p-1 md:p-2" />
            <span className="text-xs md:text-sm text-gray-300 text-center">Lost Puppies UK</span>
          </div>
        </div>
      </div>

      {/* Terminal-style footer */}
      <div className="absolute bottom-0 left-0 w-full px-4 pb-6 z-10 select-none pointer-events-none">
        <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center text-xs text-gray-500 font-mono tracking-tight gap-1 md:gap-0">
          <span>&gt; SATURDAY 21, 2025 // 3:00 PM CEST</span>
          <span className="text-red-500">// bodax.dev/masters</span>
        </div>
      </div>

      {/* Discord button */}
      <div className="fixed bottom-4 md:bottom-8 right-4 md:right-8 z-30">
        <button
          onClick={() => window.open(DISCORD_INVITE, '_blank')}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 md:px-4 rounded-lg shadow-lg border border-red-800 transition-all duration-200 text-sm md:text-base"
        >
          Join Discord
        </button>
      </div>

      {/* Login and Register buttons */}
      <div className="fixed bottom-4 md:bottom-8 left-4 md:left-8 z-30 flex space-x-3">
        <button
          onClick={() => window.location.href = '/login'}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 md:px-4 rounded-lg shadow-lg border border-blue-800 transition-all duration-200 text-sm md:text-base"
        >
          Admin Login
        </button>
        <button
          onClick={() => window.location.href = '/register'}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 md:px-4 rounded-lg shadow-lg border border-green-800 transition-all duration-200 text-sm md:text-base"
        >
          Register
        </button>
      </div>
    </div>
  );
};

export default CountdownPage; 