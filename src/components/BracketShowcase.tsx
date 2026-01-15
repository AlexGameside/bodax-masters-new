const BracketShowcase = () => {
  const renderMatchBox = (matchNumber: number, format: 'BO1' | 'BO3' = 'BO1') => {
    return (
      <div className="w-full text-left bg-black/30 border border-gray-800" style={{ minWidth: '140px' }}>
        {/* Match Header */}
        <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
          <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">
            #{matchNumber}
          </div>
          <div className="text-xs text-red-500 font-mono uppercase tracking-widest">
            {format === 'BO3' ? 'B03' : 'B01'}
          </div>
        </div>

        {/* Teams */}
        <div className="p-3 space-y-2">
          {/* Team 1 */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-white font-bodax uppercase tracking-wide text-lg">
              TBD
            </div>
            <div className="text-gray-300 font-mono text-lg">
              -
            </div>
          </div>
          
          {/* Team 2 */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-white font-bodax uppercase tracking-wide text-lg">
              TBD
            </div>
            <div className="text-gray-300 font-mono text-lg">
              -
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex justify-center">
      {/* Bracket Tree Structure - horizontal columns with centered alignment */}
      <div className="flex items-center gap-6">
        {/* Round 1 Column - 4 matches stacked */}
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((num) => renderMatchBox(num))}
        </div>

        {/* Round 2 Column - 2 matches stacked, centered in middle of round 1 */}
        <div className="flex flex-col gap-6 self-center">
          {[5, 6].map((num) => renderMatchBox(num))}
        </div>

        {/* Final Column - 1 match, centered in middle of round 2 */}
        <div className="flex flex-col self-center">
          {renderMatchBox(7)}
        </div>
      </div>
    </div>
  );
};

export default BracketShowcase;
