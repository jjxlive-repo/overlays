window.CROWD_GLASS_CONFIG = {
  canvasWidth: 1080,
  canvasHeight: 1920,

  websocketEnabled: true,
  websocketUrl: "ws://127.0.0.1:7788",
  websocketReconnectMs: 2000,

  ablyEnabled: true,
  ablyKey: "Y8e-eA.l0VHlg:aJXsEfu1Be4BYsAeATRMI3w30YAKSs_LyF3DPoesIz0",
  ablyChannel: "splat-overlay",

  autoMode: true,
  crackScale: 1,
  damageMultiplier: 1,

  soundEnabled: true,
  soundVolume: 0.35,

  singleJoinDamageMin: 0.15,
  singleJoinDamageMax: 0.35,

  maxCracksOnScreen: 120,
  maxImpactLabels: 7,
  maxRecentHitters: 4,
  maxRecentRepairers: 2,

  surge: {
    maxQueuedHits: 500,
    slowIntervalMs: 72,
    mediumIntervalMs: 44,
    fastIntervalMs: 28,
    ultraIntervalMs: 18,
    maxHitsPerFrame: 4,
    hubMin: 2,
    hubMax: 4,
    hubLifetimeMs: 16000,
    tagEveryHits: 25
  },

  shatterAtIntegrity: 0,
  autoResetAfterShatterMs: 3000,

  bulletproofDurationMs: 20000,
  bulletproofDamageMultiplier: 0.1,

  placement: {
    minX: 80,
    maxX: 1000,
    minY: 140,
    maxY: 1650,
    avoidBelowY: 1750,
    centerBox: { x1: 340, y1: 700, x2: 740, y2: 1150 },
    criticalIntegrityThreshold: 20
  },

  layoutOffsets: {
    "cg-card": { x: 0, y: 0, scale: 1 }
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
