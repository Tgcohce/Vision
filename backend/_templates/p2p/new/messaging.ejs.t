---
to: p2p/<%= name %>Messaging.js
---
'use strict';

const Libp2p = require('libp2p');
const TCP = require('libp2p-tcp');
const Mplex = require('libp2p-mplex');
const { NOISE } = require('libp2p-noise');
const PeerId = require('peer-id');
const defaultsDeep = require('@nodeutils/defaults-deep');

class <%= h.capitalize(name) %>Messaging {
  constructor(options = {}) {
    this.options = defaultsDeep(options, {
      maxPeers: <%= maxPeers %>,
      protocol: '<%= protocol %>',
      listenAddrs: ['/ip4/0.0.0.0/tcp/0']
    });
    this.node = null;
  }

  async createNode() {
    try {
      const peerId = await PeerId.create();
      this.node = await Libp2p.create({
        peerId,
        addresses: {
          listen: this.options.listenAddrs
        },
        modules: {
          transport: [TCP],
          streamMuxer: [Mplex],
          connEncryption: [NOISE]
        }
      });
      return this.node;
    } catch (error) {
      console.error('Error creating P2P node:', error);
      throw error;
    }
  }

  async start() {
    try {
      if (!this.node) {
        await this.createNode();
      }
      await this.node.start();
      console.log('P2P node started with Peer ID:', this.node.peerId.toB58String());
    } catch (error) {
      console.error('Error starting P2P node:', error);
      throw error;
    }
  }

  async stop() {
    try {
      if (this.node) {
        await this.node.stop();
        console.log('P2P node stopped.');
      }
    } catch (error) {
      console.error('Error stopping P2P node:', error);
      throw error;
    }
  }

  /**
   * Sends a message to a peer using a specified protocol.
   * @param {string} peerIdStr - The peer's ID in string format.
   * @param {string} message - The message to send.
   */
  async sendMessage(peerIdStr, message) {
    try {
      if (!this.node) {
        throw new Error('P2P node not started.');
      }
      const { stream } = await this.node.dialProtocol(peerIdStr, this.options.protocol);
      // Writing the message to the stream
      await stream.sink([Buffer.from(message)]);
      console.log(`Message sent to peer ${peerIdStr}`);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
}

module.exports = <%= h.capitalize(name) %>Messaging;
