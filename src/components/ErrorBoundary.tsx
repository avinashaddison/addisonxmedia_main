import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Link } from "react-router-dom";

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

/** Catches uncaught render errors anywhere in the tree.
 *  Shows a poster-styled fallback instead of a blank white screen. */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#FFF6E8] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border-2 border-[#D4308E] rounded-2xl shadow-[0_6px_0_0_#A11A6A] p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#D4308E] to-[#A11A6A] text-white flex items-center justify-center shadow-md mb-4">
            <AlertTriangle className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Kuch toot gaya</h1>
          <p className="text-[13px] text-foreground/70 font-medium mt-2 leading-relaxed">
            Something unexpected went wrong on this page. Hum already pata laga rahe hain.
          </p>
          {this.state.error?.message && (
            <p className="text-[10px] text-foreground/50 font-mono mt-3 p-2 bg-[#FFF1D6] rounded border border-[#E8B968] break-all">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-2 justify-center mt-5">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6A1F] text-white font-extrabold text-sm shadow-[0_3px_0_0_#B8420A] hover:shadow-[0_1px_0_0_#B8420A] hover:translate-y-[2px] transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reload
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-[#E8B968] text-foreground font-extrabold text-sm hover:bg-[#FFF1D6] transition"
            >
              <Home className="w-3.5 h-3.5" /> Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
