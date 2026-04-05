// ─── TOUR STEPS ───────────────────────────────────────────────────────────────
// Each step targets a DOM element via its data-tour attribute.
// position: which side of the spotlight the tooltip card appears on.
// ──────────────────────────────────────────────────────────────────────────────

export const TOUR_STORAGE_KEY = 'outbreak-tour-seen'

export const TOUR_STEPS = [
  {
    target: 'canvas',
    title: 'The City',
    position: 'right',
    body: 'Each dot is a person moving through a simulated population. The disease begins with a small number of infected individuals and spreads through contact. Everything you see is live — the dots move, infect, recover, and die in real time as the simulation runs.',
  },
  {
    target: 'dashboard',
    title: 'Disease States',
    position: 'right',
    body: 'Every person is in one of six states at any moment. Susceptible (grey) — not yet exposed. Vaccinated (purple) — immune from the start. Exposed (amber) — infected but not yet contagious. Infected (red) — actively spreading. Recovered (teal) — no longer infectious. Dead (dark). These counters update live throughout the run.',
  },
  {
    target: 'control-bar',
    title: 'Running the Simulation',
    position: 'top',
    body: 'RUN starts the epidemic. PAUSE freezes it mid-run — useful for studying a moment in detail — RESUME picks up from where you left off. RESET restarts with your current parameters. The day counter tracks elapsed simulation time. Speed controls how fast the simulation moves; higher values compress more days per second.',
  },
  {
    target: 'seed',
    title: 'Reproducible Runs',
    position: 'left',
    body: 'Every run is driven by a random seed — the number shown here. If you want to run a truly comparable BASELINE against a WHAT-IF, use the button to LOCK the seed so that you can isolate the effects of your what-if.',
  },
  {
    target: 'config-panel',
    title: 'Parameters',
    position: 'left',
    body: 'All simulation settings live in this panel, organised into collapsible sections. Click any section heading to expand or collapse it. Your layout is remembered across visits. When you see a yellow warning next to Reset, it means you\'ve changed parameters since the last run — hit Reset to apply them.',
  },
  {
    target: 'presets-section',
    title: 'Start From a Real Disease',
    position: 'left',
    body: 'Presets load realistic parameters for known diseases — Flu, COVID-19, Measles, and others. Each is calibrated to match real-world transmission and severity data. Completely optional — skip if you\'d rather build parameters from scratch. Important: read the R₀ & Calibration note since R₀ is an emergent property and will require fine-tuning on your system.',
  },
  {
    target: 'physics-movement',
    title: 'Contact Rate & Movement',
    position: 'left',
    body: 'Dot size and movement speed together control how often dots collide — which determines how many transmission opportunities occur per simulated day. Larger dots + higher speed = more contacts = faster spread, independent of the disease parameters. There is no universally "correct" setting; think of them as representing population density and how much people move. The presets are calibrated at specific values — if you change dot size or speed, your emergent R₀ will shift accordingly.',
  },
  {
    target: 'disease-model-section',
    title: 'The Pathogen',
    position: 'left',
    body: 'This is the disease itself. Transmission probability controls how easily it spreads on contact. Incubation period sets how long a person is Exposed before becoming contagious. Recovery time, lethality (IFR), and re-infection risk are also tunable here. Small changes to transmission probability can have outsized effects on outbreak size.',
  },
  {
    target: 'interventions-section',
    title: 'Public Health Response',
    position: 'left',
    body: 'Model what happens when society responds. Mask wearing reduces transmission when either party wears one — compliance rate controls how many people actually do. Quarantine removes infectious individuals from circulation. Intervention Day is the most important lever: set to 7 means the disease spreads freely for one week before any measures activate, mimicking a realistic delayed response.',
  },
  {
    target: 'population-section',
    title: 'Who\'s in the Simulation',
    position: 'left',
    body: 'Set population size, the number of index cases at day zero, and the percentage of the population that starts pre-vaccinated — representing background immunity before the outbreak begins. Larger populations produce smoother, more statistically stable curves but run slower depending on your device.',
  },
  {
    target: 'simulation-section',
    title: 'When Does It End?',
    position: 'left',
    body: 'The simulation stops on its own when the disease dies out — either zero active cases remain, or no new infections have occurred for several consecutive days (fizzle). You can also set a hard ceiling with Max Days to keep runs short while you\'re still exploring. While you\'re learning the system, a shorter Max Days can save time — you can always raise it for serious runs.',
  },
  {
    target: 'line-chart',
    title: 'Trend Charts',
    position: 'top',
    body: 'Four ways to read the epidemic over time. Infected — cumulative spread. Deaths — cumulative fatalities. States — a stacked view of the full population breakdown at every point; hover anywhere to see exact percentages. Daily New — infection rate per day, with a second line showing reinfections. Switch modes using the buttons in the top right.',
  },
  {
    target: 'baseline-controls',
    title: 'Comparing What-If Scenarios',
    position: 'bottom',
    body: 'After a run completes, Set BL saves it as your reference baseline. Remember to LOCK your seed first. Then change a parameter — increase mask compliance, shorten the intervention delay, whatever you want to test — reset and run again. Both runs appear together across all charts. On the States view, hovering your cursor splits the screen: your new run on the left, the baseline on the right.',
  },
  {
    target: 'population-chart',
    title: 'Population Snapshot',
    position: 'top',
    body: 'A live bar chart of where the population stands right now, one bar per disease state. Toggle between percentage and raw count using the buttons in the top right. When a baseline is active, each state shows two bars side by side — the baseline run faded on the left, your current run on the right — so the final state comparison is immediate.',
  },
]
