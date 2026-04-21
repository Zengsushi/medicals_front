const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4
};

const LEVEL_NAMES = {
  [LOG_LEVELS.DEBUG]: "DEBUG",
  [LOG_LEVELS.INFO]: "INFO ",
  [LOG_LEVELS.WARN]: "WARN ",
  [LOG_LEVELS.ERROR]: "ERROR"
};

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m"
};

const isDev = import.meta.env?.DEV ?? 
  (typeof process !== "undefined" && process.env?.NODE_ENV !== "production");

let currentLevel = isDev ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

function getTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function colorize(text, color) {
  if (!isDev) return text;
  return `${color}${text}${COLORS.reset}`;
}

function formatArgs(args) {
  return args.map((arg) => {
    if (arg === null) return "null";
    if (arg === undefined) return "undefined";
    if (typeof arg === "object") {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  });
}

function log(level, tag, ...args) {
  if (level < currentLevel) return;

  const levelName = LEVEL_NAMES[level];
  const timestamp = getTimestamp();
  const prefix = `${colorize(timestamp, COLORS.dim)} ${colorize(levelName, getLevelColor(level))}`;
  
  let message;
  if (tag) {
    message = `${prefix} [${colorize(tag, COLORS.cyan)}]`;
  } else {
    message = prefix;
  }

  const formattedArgs = formatArgs(args);

  switch (level) {
    case LOG_LEVELS.ERROR:
      console.error(message, ...formattedArgs);
      break;
    case LOG_LEVELS.WARN:
      console.warn(message, ...formattedArgs);
      break;
    case LOG_LEVELS.DEBUG:
      console.debug(message, ...formattedArgs);
      break;
    default:
      console.log(message, ...formattedArgs);
  }
}

function getLevelColor(level) {
  switch (level) {
    case LOG_LEVELS.ERROR:
      return COLORS.red;
    case LOG_LEVELS.WARN:
      return COLORS.yellow;
    case LOG_LEVELS.INFO:
      return COLORS.blue;
    case LOG_LEVELS.DEBUG:
      return COLORS.magenta;
    default:
      return COLORS.white;
  }
}

export function createLogger(tag = "") {
  return {
    debug(...args) {
      log(LOG_LEVELS.DEBUG, tag, ...args);
    },
    info(...args) {
      log(LOG_LEVELS.INFO, tag, ...args);
    },
    warn(...args) {
      log(LOG_LEVELS.WARN, tag, ...args);
    },
    error(...args) {
      log(LOG_LEVELS.ERROR, tag, ...args);
    },

    group(label) {
      if (isDev) {
        console.group(`${colorize(getTimestamp(), COLORS.dim)} [${colorize(tag || "LOG", COLORS.cyan)}] ${label}`);
      }
    },
    groupEnd() {
      if (isDev) {
        console.groupEnd();
      }
    },

    time(label) {
      if (isDev) {
        console.time(`[${tag}] ${label}`);
      }
    },
    timeEnd(label) {
      if (isDev) {
        console.timeEnd(`[${tag}] ${label}`);
      }
    },

    table(data) {
      if (isDev && currentLevel <= LOG_LEVELS.DEBUG) {
        console.table(data);
      }
    }
  };
}

export const logger = createLogger();

export function setLogLevel(level) {
  if (typeof level === "string") {
    const upperLevel = level.toUpperCase();
    currentLevel = LOG_LEVELS[upperLevel] ?? LOG_LEVELS.WARN;
  } else if (typeof level === "number") {
    currentLevel = level;
  }
}

export function getLogLevel() {
  return currentLevel;
}

export { LOG_LEVELS };

export default logger;
