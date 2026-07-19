window.CROWD_GLASS_CONFIG = {
  canvasWidth: 1080,
  canvasHeight: 1920,

  websocketEnabled: true,
  websocketUrl: "ws://127.0.0.1:7788",
  websocketReconnectMs: 2000,

  // Optional live intake from stream-dock.html, which already relays TikTok/YouTube
  // events from Social Stream Ninja + Tikfinity over Ably. Same key/channel stream-dock
  // uses ("splat-overlay"), so this overlay just joins the existing pub/sub feed.
  ablyEnabled: true,
  ablyKey: "Y8e-eA.l0VHlg:aJXsEfu1Be4BYsAeATRMI3w30YAKSs_LyF3DPoesIz0",
  ablyChannel: "splat-overlay",

  // When false, live join/gift/viewer-count events from Ably are ignored — only
  // manual commands (from stream-dock's Crowd Glass panel or keyboard) affect the glass.
  autoMode: true,

  // Global crack-size multiplier, adjustable live from stream-dock's Layout panel.
  crackScale: 1,

  soundEnabled: true,
  soundVolume: 0.35,

  singleJoinDamageMin: 0.25,
  singleJoinDamageMax: 0.75,

  maxCracksOnScreen: 40,
  maxImpactLabels: 6,
  maxRecentHitters: 3,

  burstDamageCap: 18,
  burstMaxCracks: 5,

  shatterAtIntegrity: 0,
  autoResetAfterShatterMs: 3000,

  bulletproofDurationMs: 20000,
  bulletproofDamageMultiplier: 0.1,

  // Placement bounds, keep clear of platform UI at the very bottom.
  placement: {
    minX: 80,
    maxX: 1000,
    minY: 140,
    maxY: 1650,
    avoidBelowY: 1750,
    // A center "face/camera" box that is de-prioritized unless glass is critical.
    centerBox: { x1: 340, y1: 700, x2: 740, y2: 1150 },
    criticalIntegrityThreshold: 20
  },

  // Runtime position offsets (px, in 1080x1920 stage space) layered on top of the CSS
  // defaults via transform: translate(). Updated live from stream-dock's Layout panel.
  layoutOffsets: {
    "cg-cta": { x: 0, y: 0 },
    "cg-integrity": { x: 0, y: 0 },
    "cg-viewerbadge": { x: 0, y: 0 },
    "cg-livebadge": { x: 0, y: 0 }
  },

  copy: {
    mainHook: "NEXT VIEWER CRACKS THE SCREEN",
    repairHook: "GIFTS REPAIR IT",
    shatter: "screen shattered",
    shatterSub: "new viewers broke it",
    bulletproof: "BULLETPROOF"
  },

  giftRepairTiers: [
    { name: "micro", minCoins: 1, repairAmount: 3, effect: "seal_one_crack" },
    { name: "small", minCoins: 50, repairAmount: 8, effect: "seal_recent_cracks" },
    { name: "medium", minCoins: 250, repairAmount: 15, effect: "repair_sweep" },
    { name: "large", minCoins: 1000, repairAmount: 30, effect: "major_repair" },
    { name: "huge", minCoins: 5000, repairAmount: 60, effect: "full_wipe" },
    { name: "mega", minCoins: 10000, repairAmount: 100, effect: "bulletproof_mode" }
  ]
};
