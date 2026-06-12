import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-error">
          <h2>Something went wrong</h2>
          <p>{this.state.error.message}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
