import Image from "next/image";



export default function Avatar(
    {
        size,
        image_url,
        alt,
        className
    } : {
        size: number,
        image_url: string,
        alt: string,
        className?: string
    }
) {
    return (
        <div 
            className={
                `
                    rounded-full border border-border-default
                    w-10 h-10 ${className}
                `
            }
        >
           <Image 
                src={image_url}
                alt={alt}
                width={size}
                height={size}
                className="rounded-full w-full h-full"
           />
        </div>
    )
}