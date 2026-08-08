import { LucideIcon } from "lucide-react";

export default function Input(
    {
        placeholder, 
        onClick,
        className,
        prefixIcon: PrefixIcon,
        suffixIcon: SuffixIcon,
        iconPrefixClassName,
        iconSuffixClassName
    }:
    {
        placeholder: string; 
        onClick?: () => void;
        className?: string; 
        prefixIcon?: LucideIcon;
        suffixIcon?: LucideIcon;
        iconPrefixClassName?: string;
        iconSuffixClassName?: string;
    }
) {
    return (
        <div className="relative flex items-center w-full">
            {PrefixIcon && (
                <PrefixIcon
                    className={`absolute left-3 w-5 h-5 text-black/60 ${iconPrefixClassName ?? ""}`}
                />
            )}

            <input 
                type="text"  
                placeholder={placeholder}
                onClick={onClick}
                className={`
                    bg-white rounded-xl
                    text-black font-medium text-xl
                    p-3
                    ${PrefixIcon ? "pl-10" : ""}
                    ${SuffixIcon ? "pr-10" : ""}
                    w-full
                    ${className ?? ""}
                `}
            />

            {SuffixIcon && (
                <SuffixIcon
                    className={`absolute right-3 w-5 h-5 text-black/60 ${iconSuffixClassName ?? ""}`}
                />
            )}
        </div>
    )
}