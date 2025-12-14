import { Component } from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    // eslint-disable-next-line no-unused-vars
    static getDerivedStateFromError(_error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        // Optionally reload the page to reset app state
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                    <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8 border border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-rose-600">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">Something went wrong</h1>
                                <p className="text-sm text-slate-500">The application encountered an unexpected error</p>
                            </div>
                        </div>

                        {this.state.error && (
                            <div className="mb-4 p-3 bg-slate-50 rounded border border-slate-200">
                                <p className="text-xs font-bold text-slate-600 mb-1">Error Message:</p>
                                <p className="text-sm text-rose-600 font-mono break-all">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors"
                            >
                                Reload Application
                            </button>
                            <button
                                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-lg transition-colors border border-slate-300"
                            >
                                Try Again
                            </button>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                            <details className="mt-4">
                                <summary className="cursor-pointer text-xs font-bold text-slate-600 hover:text-slate-800">
                                    Stack Trace (Development Only)
                                </summary>
                                <pre className="mt-2 p-3 bg-slate-900 text-slate-100 rounded text-xs overflow-auto max-h-64">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired
};

export default ErrorBoundary;
