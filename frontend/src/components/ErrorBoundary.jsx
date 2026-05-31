/* Top-level error boundary — renders a readable error instead of a blank page
   if any component throws (e.g. a viewer init failure). */
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Oncoscope error boundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 28, fontFamily: 'system-ui, sans-serif', maxWidth: 760 }}>
          <h2 style={{ color: '#b00', margin: '0 0 8px' }}>Something went wrong</h2>
          <p style={{ color: '#6a7178', margin: '0 0 14px' }}>
            A component crashed. Details below (also in the browser console).
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#faf9f6', border: '1px solid #e7e5de', borderRadius: 8, padding: 14, fontSize: 12.5, color: '#3c424a', overflow: 'auto' }}>
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
