import { Ellipsis, Plus } from "lucide-react";



export default function MenuBar() {
    return (
        <aside className="w-14 h-screen border-r border-r-border-default p-4">
           <div className="flex flex-col items-center justify-center pt-2">
                <button 
                    className="
                        cursor-pointer text-text-secondary 
                        hover:text-text-primary transition-colors
                        "
                >
                    <Ellipsis size={25}/>
                </button>

                <div className="pt-8">
                    <button 
                        className="
                            border border-border-default text-text-secondary 
                            p-2 rounded-md cursor-pointer hover:bg-bg-hover 
                            hover:text-text-primary transition-colors
                            "
                    >
                        <Plus />
                    </button>
                </div>
           </div>



           <div>
                {
                    /*
                        TODO:
                            CONNECTED APPS eg: figma
                    */
                }
           </div>

        </aside>
    )
}