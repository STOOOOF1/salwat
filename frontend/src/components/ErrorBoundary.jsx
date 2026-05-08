import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card text-center py-8">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-600 font-cairo mb-2">حدث خطأ</h2>
          <p className="text-gray-500 font-cairo mb-4">{this.props.message || 'عذراً، حدث خطأ غير متوقع'}</p>
          {this.state.error && (
            <details className="text-xs text-red-400 mb-4 text-left max-h-32 overflow-auto" dir="ltr">
              <summary>تفاصيل الخطأ</summary>
              {this.state.error.message}
            </details>
          )}
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
            className="btn-primary font-cairo"
          >
            إعادة التحميل
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
