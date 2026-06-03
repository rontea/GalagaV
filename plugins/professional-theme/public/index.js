
(function(global) {
  const React = global.React;

  const Microsoft365Theme = ({ theme, onNotify }) => {
    React.useEffect(() => {
      onNotify("Microsoft 365 System Theme Engine Initialized.");
    }, []);

    return React.createElement('div', { className: "p-12 flex flex-col items-center justify-center text-center font-sans h-full bg-[#faf9f8] dark:bg-[#11100f] text-[#323130] dark:text-[#ffffff]" },
      React.createElement('div', { className: "w-16 h-16 bg-[#0078d4] rounded-lg flex items-center justify-center text-white mb-6 shadow-lg" },
        React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
          React.createElement('rect', { x: "2", y: "3", width: "20", height: "14", rx: "2", ry: "2" }),
          React.createElement('line', { x1: "8", y1: "21", x2: "16", y2: "21" }),
          React.createElement('line', { x1: "12", y1: "17", x2: "12", y2: "21" })
        )
      ),
      React.createElement('h1', { className: "text-2xl font-bold mb-2" }, "Microsoft 365 System Theme"),
      React.createElement('p', { className: "text-[#605e5c] dark:text-[#c8c6c4] max-w-sm text-sm leading-relaxed" }, 
        "The system-wide Microsoft 365 design language is active. Fluent UI design tokens, typography, and color palettes have been applied to optimize productivity and accessibility."
      ),
      React.createElement('div', { className: "mt-8 grid grid-cols-2 gap-4" },
        React.createElement('div', { className: "px-4 py-2 bg-white dark:bg-[#252423] border border-[#edebe9] dark:border-[#323130] rounded text-[10px] font-mono font-bold uppercase tracking-tighter" }, `Mode: ${theme}`),
        React.createElement('div', { className: "px-4 py-2 bg-white dark:bg-[#252423] border border-[#edebe9] dark:border-[#323130] rounded text-[10px] font-mono font-bold uppercase tracking-tighter" }, "Version: 1.2.0_M365")
      )
    );
  };

  global.GalagaPlugin_ProfessionalTheme = { Component: Microsoft365Theme };
})(window);
