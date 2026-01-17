import React from 'react';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    handleHardReset = () => {
        if (confirm("Are you sure you want to hard reset everything? This will delete all your font configurations and local data.")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 p-6 font-sans">
                    <div className="max-w-md w-full bg-white rounded-xl shadow-xl border border-slate-200 p-8 text-center">
                        <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>

                        <h1 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h1>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            The application encountered a critical error and cannot continue.
                            <br />
                            <code className="bg-slate-100 px-1 py-0.5 rounded text-xs text-slate-600 mt-2 block overflow-hidden text-ellipsis whitespace-nowrap">
                                {this.state.error?.message || "Unknown Error"}
                            </code>
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                            >
                                Reload Page
                            </button>

                            <button
                                onClick={this.handleHardReset}
                                className="w-full py-2.5 px-4 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold rounded-lg transition-colors"
                            >
                                Hard Reset App (Clear Data)
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
