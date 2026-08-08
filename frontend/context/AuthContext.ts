import { createContext } from "react";
import { AuthContextType } from "@/types/ContextTypes";

export const AuthContext = createContext<AuthContextType | null>(null);
