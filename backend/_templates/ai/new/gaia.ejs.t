---
to: ai/<%= name %>Gaia.js
---
'use strict';

const axios = require('axios');
const retry = require('async-retry');

/**
 * <%= h.capitalize(name) %>Gaia integrates with the Gaia AI service.
 */
class <%= h.capitalize(name) %>Gaia {
  constructor(options = {}) {
    this.model = process.env.GAIA_MODEL || '<%= model %>';
    this.threshold = +(process.env.GAIA_THRESHOLD || <%= threshold %>);
    this.endpoint = process.env.GAIA_ENDPOINT || options.endpoint || 'http://default-gaia-endpoint';
    this.axiosInstance = axios.create({
      baseURL: this.endpoint,
      timeout: 5000
    });
  }

  async analyze(data) {
    try {
      const response = await retry(async () => {
        const res = await this.axiosInstance.post('/analyze', {
          model: this.model,
          data,
          threshold: this.threshold
        });
        return res;
      }, {
        retries: 3,
        onRetry: (err, attempt) => {
          console.warn(`Retry attempt ${attempt} for Gaia analysis: ${err.message}`);
        }
      });
      return response.data;
    } catch (error) {
      console.error('Gaia analysis failed:', error);
      throw error;
    }
  }
}

module.exports = <%= h.capitalize(name) %>Gaia;
