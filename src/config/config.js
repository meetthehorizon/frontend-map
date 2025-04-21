// src/config/config.js
import yaml from 'js-yaml';

// Function to load configuration from YAML
export async function loadConfig() {
  try {
    const response = await fetch('/config.yaml');
    const yamlText = await response.text();
    const config = yaml.load(yamlText);
    return config;
  } catch (error) {
    console.error('Error loading configuration:', error);
    // Fallback configuration
    return {
      api: {
        baseUrl: 'http://localhost:5000',
        endpoints: {
          query: '/api/query'
        }
      },
      theme: {
        defaultMode: 'light'
      }
    };
  }
}

// Helper function to get the complete API URL
export function getApiUrl(endpoint) {
  const config = window.appConfig;
  return `${config.api.baseUrl}${config.api.endpoints[endpoint]}`;
}