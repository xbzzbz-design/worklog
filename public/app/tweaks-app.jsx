/* WorkLog — Tweaks island (drives the vanilla app via window.WL) */
const WL_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "Indigo",
  "mode": "Light",
  "dailyMax": 7,
  "serifHeads": true
}/*EDITMODE-END*/;

function WLTweaks() {
  const [t, setTweak] = useTweaks(WL_TWEAK_DEFAULTS);

  React.useEffect(() => {
    if (window.WL && window.WL.applyTweaks) window.WL.applyTweaks(t);
  }, [t.accent, t.mode, t.dailyMax, t.serifHeads]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Theme" />
      <TweakColor label="Accent" value={accentHex(t.accent)}
        options={['#4b3fb0', '#9a3fa0', '#1f8a86', '#5b6478']}
        onChange={(hex) => setTweak('accent', accentName(hex))} />
      <TweakRadio label="Mode" value={t.mode}
        options={['Light', 'Dark']}
        onChange={(v) => setTweak('mode', v)} />
      <TweakToggle label="Serif headlines" value={t.serifHeads}
        onChange={(v) => setTweak('serifHeads', v)} />
      <TweakSection label="Workload" />
      <TweakSlider label="Daily max credits" value={t.dailyMax} min={4} max={12} step={1} unit=" units"
        onChange={(v) => setTweak('dailyMax', v)} />
    </TweaksPanel>
  );
}

const ACCENT_HEX = { Indigo: '#4b3fb0', Plum: '#9a3fa0', Teal: '#1f8a86', Slate: '#5b6478' };
function accentHex(name) { return ACCENT_HEX[name] || ACCENT_HEX.Indigo; }
function accentName(hex) { return Object.keys(ACCENT_HEX).find(k => ACCENT_HEX[k] === hex) || 'Indigo'; }

(function mountTweaks() {
  function start() {
    const el = document.getElementById('tweaksRoot');
    if (!el || !window.useTweaks) { return setTimeout(start, 60); }
    ReactDOM.createRoot(el).render(<WLTweaks />);
  }
  start();
})();
