---
to: ai/<%= name %>Gaia.js
---
'use strict';

const axios = require('axios');
const retry = require('async-retry');

class <%= h.capitalize(name) %>Gaia {
  constructor(options = {}) {
    this.model = '<%= model %>';
    this.threshold = <%= threshold %>;
    this.endpoint = options.endpoint || 'http://gaia.example.com/api';
    this.axiosInstance = axios.create({
      baseURL: this.endpoint,
      timeout: 5000
    });
  }

  /**
   * Sends data for analysis to the Gaia AI service.
   * @param {Object} data - The input data for analysis.
   * @returns {Promise<Object>} - The analysis results.
   */
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
          console.warn(`Retry attempt ${attempt} for Gaia analysis due to: ${err.message}`);
        }
      });
      return response.data;
    } catch (error) {
      console.error('Gaia analysis failed after retries:', error);
      throw error;
    }
  }
}

module.exports = <%= h.capitalize(name) %>Gaia;
