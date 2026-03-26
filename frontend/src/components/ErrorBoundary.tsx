/**
 * Error boundary for pipeline/output components.
 *
 * Layer: Frontend / Component
 * Catches React render errors in children (e.g. when rendering pipeline output).
 * Logs the error and displays a fallback UI.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "../lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Error boundary caught render error", {
      message: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded p-4">
          <h3 className="font-semibold mb-2">Something went wrong</h3>
          <p className="text-sm">{this.state.error.message}</p>
          <p className="text-xs mt-2 text-red-600">
            Check the console for details. Try refreshing or re-running Compute.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
