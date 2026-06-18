'use strict';

/** Minimal client for the Cloud Panel REST API used by /server commands. */

const config = require('../../config');

class CloudPanel {
  constructor(opts = config.cloudPanel) {
    this.url = opts.url;
    this.staticToken = opts.token;
    this.email = opts.email;
    this.password = opts.password;
    this.token = opts.token || null;
    this.enabled = opts.enabled;
  }

  async ensureToken() {
    if (this.staticToken) return this.staticToken;
    if (this.token) return this.token;
    return this.login();
  }

  async login() {
    const res = await fetch(`${this.url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: this.email, password: this.password }),
    });
    if (!res.ok) throw new Error(`Cloud Panel login failed (${res.status})`);
    const data = await res.json();
    this.token = data.token;
    return this.token;
  }

  async req(method, path, body, retry = true) {
    const token = await this.ensureToken();
    const res = await fetch(`${this.url}/api${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401 && retry && !this.staticToken) {
      this.token = null;
      return this.req(method, path, body, false);
    }
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) throw new Error(data.error || data.raw || `Request failed (${res.status})`);
    return data;
  }

  async listServers() {
    return (await this.req('GET', '/servers')).data;
  }

  async getServer(id) {
    return (await this.req('GET', `/servers/${id}`)).data;
  }

  async resources(id) {
    return (await this.req('GET', `/servers/${id}/resources`)).data;
  }

  async power(id, action) {
    return this.req('POST', `/servers/${id}/power`, { action });
  }

  async command(id, command) {
    return this.req('POST', `/servers/${id}/command`, { command });
  }

  /** Find a server by name (case-insensitive contains), identifier or id. */
  async findServer(query) {
    const list = await this.listServers();
    const q = String(query).toLowerCase();
    return (
      list.find((s) => s.id === query || s.identifier === query) ||
      list.find((s) => s.name.toLowerCase() === q) ||
      list.find((s) => s.name.toLowerCase().includes(q)) ||
      null
    );
  }
}

module.exports = { CloudPanel };
