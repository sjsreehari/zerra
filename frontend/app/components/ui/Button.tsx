import { LucideIcon } from "lucide-react";


export default function Button(
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
        <button
            className={
                `
                    flex items-center gap-2
                    bg-white p-3 rounded-xl
                    text-black font-medium text-xl
                    ${className}
                `
            }
            onClick={onClick}
        >
            { PrefixIcon && <PrefixIcon className={ iconPrefixClassName }/> }
            { placeholder }
            { SuffixIcon && <SuffixIcon className={ iconSuffixClassName }/> }
        </button>
    )

}