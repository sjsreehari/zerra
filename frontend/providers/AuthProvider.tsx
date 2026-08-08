/* eslint-disable react-hooks/exhaustive-deps */
import { APIENDPOINT } from "@/config/Backend";
import { AuthContext } from "@/context/AuthContext";
import { useApiCall } from "@/hooks/useApiCall";
import { User } from "@/types/ContextTypes";
import { useEffect, useState } from "react";


export function AuthProvider({ children }: { children: React.ReactNode }) {

    const { makeApiCall } = useApiCall()

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const validate = async () => {
            try {
                const res = await makeApiCall(
                    "GET",
                    APIENDPOINT.Validate
                );

                if (res.status === 200) {
                    setUser(res.data);
                } else {
                    setUser(null);
                }
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        validate()
    }, [ ])


    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    )
}   