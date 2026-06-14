import React from 'react';

interface State {
  hasError: boolean;
  error?: Error | null;
}

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // send to remote logging if needed
    // eslint-disable-next-line no-console
    console.error('Uncaught error in component tree:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-6">
            <h2 className="font-poppins font-bold text-lg text-red-600 mb-2">Une erreur est survenue</h2>
            <p className="font-lato text-sm text-gray-700 mb-4">L'application a rencontré une erreur. Voir la console pour plus de détails.</p>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words">{String(this.state.error)}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
