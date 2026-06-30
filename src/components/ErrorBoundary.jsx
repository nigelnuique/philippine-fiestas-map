import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const detail =
        import.meta.env.DEV
          ? this.state.error.message
          : "Try reloading the page. If the problem continues, check that map data finished loading.";
      return (
        <div className="app-error">
          <h2>Something went wrong</h2>
          <p>{detail}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
