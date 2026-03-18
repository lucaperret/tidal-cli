"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadStorage = loadStorage;
exports.saveStorage = saveStorage;
exports.installLocalStorage = installLocalStorage;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const SESSION_DIR = path.join(os.homedir(), '.tidal-cli');
const SESSION_FILE = path.join(SESSION_DIR, 'session.json');
function ensureDir() {
    if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { mode: 0o700 });
    }
}
function loadStorage() {
    ensureDir();
    if (!fs.existsSync(SESSION_FILE))
        return {};
    try {
        return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    }
    catch {
        return {};
    }
}
function saveStorage(data) {
    ensureDir();
    fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}
/**
 * Install a globalThis.localStorage polyfill backed by ~/.tidal-cli/session.json.
 * Must be called before importing @tidal-music/auth.
 */
function installLocalStorage() {
    // Always install our file-backed polyfill — Node.js 22+ has a built-in
    // localStorage that requires --localstorage-file to work, so we override it.
    let store = loadStorage();
    const localStorage = {
        getItem(key) {
            // Re-read from disk to pick up any changes
            store = loadStorage();
            return store[key] ?? null;
        },
        setItem(key, value) {
            store[key] = value;
            saveStorage(store);
        },
        removeItem(key) {
            delete store[key];
            saveStorage(store);
        },
        clear() {
            store = {};
            saveStorage(store);
        },
        key(index) {
            return Object.keys(store)[index] ?? null;
        },
        get length() {
            return Object.keys(store).length;
        },
    };
    Object.defineProperty(globalThis, 'localStorage', {
        value: localStorage,
        writable: false,
        configurable: true,
    });
}
// Polyfill browser APIs that @tidal-music/auth expects in Node.js
if (typeof globalThis.CustomEvent === 'undefined') {
    globalThis.CustomEvent = class CustomEvent extends Event {
        detail;
        constructor(type, params) {
            super(type, params);
            this.detail = params?.detail;
        }
    };
}
// EventTarget-based dispatchEvent/addEventListener for globalThis
if (typeof globalThis.dispatchEvent !== 'function') {
    const target = new EventTarget();
    globalThis.addEventListener = target.addEventListener.bind(target);
    globalThis.removeEventListener = target.removeEventListener.bind(target);
    globalThis.dispatchEvent = target.dispatchEvent.bind(target);
}
//# sourceMappingURL=session.js.map