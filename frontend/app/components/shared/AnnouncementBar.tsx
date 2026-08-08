import { X, ArrowRight } from "lucide-react";

export default function AnnouncementBar(
    {
        message,
        linkHref,
        linkLabel,
        close
    }:
    {
        message: string
        linkHref?: string
        linkLabel?: string
        close: () => void
    }
) {
    return (
        <header className="w-full h-9 bg-color-accent-light border-b border-border-default">
            <div className="relative flex items-center justify-center h-full px-8 text-sm text-text-primary">
                <span className="truncate">
                    {message}
                    {linkHref && (
                        <a 
                            href={linkHref} 
                            className="
                                inline-flex items-center gap-1 
                                ml-2 font-medium text-color-accent 
                                hover:text-color-accent-hover
                            "
                        >
                            {linkLabel ?? "Learn more"}
                            <ArrowRight size={12} />
                        </a>
                    )}
                </span>

                <button 
                    className="
                        absolute right-2 cursor-pointer 
                        text-text-secondary hover:text-text-primary 
                        transition-colors
                    "
                    onClick={close}
                    aria-label="Dismiss announcement"
                >
                    <X size={14} />
                </button>
            </div>
        </header>
    )
}