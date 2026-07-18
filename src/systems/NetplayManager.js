import Peer from 'peerjs';

const PEER_PREFIX = 'blobsurvivor-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 4; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function peerIdFromCode(code) {
  return `${PEER_PREFIX}${String(code || '').trim().toUpperCase()}`;
}

/**
 * PeerJS room helper — host creates a peer id from a short code; guest connects to it.
 */
export class NetplayManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.role = null; // 'host' | 'guest'
    this.code = null;
    this.levelId = 'plains';
    this.connected = false;
    this._handlers = {};
    this._destroyed = false;
  }

  on(event, handler) {
    this._handlers[event] = handler;
  }

  emit(event, payload) {
    const fn = this._handlers[event];
    if (fn) fn(payload);
  }

  send(msg) {
    if (!this.conn || !this.conn.open) return false;
    try {
      this.conn.send(msg);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * @param {string} code
   * @param {string} levelId
   */
  host(code, levelId = 'plains') {
    return new Promise((resolve, reject) => {
      this.destroyPeerOnly();
      this.role = 'host';
      this.code = String(code).toUpperCase();
      this.levelId = levelId;
      this.connected = false;

      const peer = new Peer(peerIdFromCode(this.code), {
        debug: 0,
      });
      this.peer = peer;

      const fail = (err) => {
        if (this._destroyed) return;
        reject(err instanceof Error ? err : new Error(String(err?.message || err || 'Host failed')));
      };

      peer.on('open', () => {
        this.emit('open', { code: this.code, role: 'host' });
        resolve({ code: this.code });
      });

      peer.on('error', (err) => {
        this.emit('error', err);
        // id-taken etc.
        fail(err);
      });

      peer.on('connection', (conn) => {
        if (this.conn && this.conn.open) {
          conn.close();
          return;
        }
        this._bindConnection(conn);
        conn.on('open', () => {
          this.connected = true;
          this.send({ type: 'hello', levelId: this.levelId, role: 'host' });
          this.emit('connected', { role: 'host', levelId: this.levelId });
        });
      });
    });
  }

  /**
   * @param {string} code
   */
  join(code) {
    return new Promise((resolve, reject) => {
      this.destroyPeerOnly();
      this.role = 'guest';
      this.code = String(code).trim().toUpperCase();
      this.connected = false;

      if (this.code.length !== 4) {
        reject(new Error('Enter a 4-character room code.'));
        return;
      }

      const peer = new Peer({ debug: 0 });
      this.peer = peer;
      let settled = false;

      const fail = (err) => {
        if (settled || this._destroyed) return;
        settled = true;
        reject(err instanceof Error ? err : new Error(String(err?.message || err || 'Join failed')));
      };

      peer.on('open', () => {
        const conn = peer.connect(peerIdFromCode(this.code), { reliable: true });
        this._bindConnection(conn);

        const timeout = setTimeout(() => {
          fail(new Error('Couldn’t connect. Check the code and try again.'));
        }, 12000);

        conn.on('open', () => {
          clearTimeout(timeout);
          this.connected = true;
          this.send({ type: 'ready', role: 'guest' });
          this.emit('connected', { role: 'guest' });
          if (!settled) {
            settled = true;
            resolve({ code: this.code });
          }
        });

        conn.on('error', (err) => {
          clearTimeout(timeout);
          fail(err);
        });
      });

      peer.on('error', (err) => fail(err));
    });
  }

  _bindConnection(conn) {
    this.conn = conn;
    conn.on('data', (data) => {
      if (!data || typeof data !== 'object') return;
      if (data.type === 'hello' && data.levelId) {
        this.levelId = data.levelId;
      }
      this.emit('message', data);
    });
    conn.on('close', () => {
      this.connected = false;
      this.emit('disconnected');
    });
    conn.on('error', (err) => {
      this.emit('error', err);
    });
  }

  destroyPeerOnly() {
    try {
      this.conn?.close();
    } catch {
      /* ignore */
    }
    this.conn = null;
    try {
      this.peer?.destroy();
    } catch {
      /* ignore */
    }
    this.peer = null;
    this.connected = false;
  }

  destroy() {
    this._destroyed = true;
    this.destroyPeerOnly();
    this._handlers = {};
  }
}

/** Module singleton so lobby → loading → game can share the connection. */
let activeNet = null;

export function getActiveNetplay() {
  return activeNet;
}

export function setActiveNetplay(net) {
  if (activeNet && activeNet !== net) {
    activeNet.destroy();
  }
  activeNet = net;
  return activeNet;
}

export function clearActiveNetplay() {
  if (activeNet) {
    activeNet.destroy();
    activeNet = null;
  }
}
