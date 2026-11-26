import { Component } from 'react'
export default class ErrorBoundary extends Component {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  componentDidCatch(e) { console.error(e) }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <section className="wrap flex min-h-[60vh] flex-col items-center justify-center pt-24 text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-3 text-4xl font-extrabold">This screen flickered.</h1>
        <button className="btn btn-primary mt-8" onClick={() => location.assign('/')}>Reload home</button>
      </section>
    )
  }
}
