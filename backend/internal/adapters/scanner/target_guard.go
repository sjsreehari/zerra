package scanner

import (
 "net"; "net/url"; "os"; "strings"
)

// TargetGuard validates only database-sourced target URLs; callers never supply a URL.
type TargetGuard struct { Resolver func(string)([]net.IP,error); Environment string }
func NewTargetGuard() TargetGuard { return TargetGuard{Resolver:net.LookupIP,Environment:os.Getenv("ENVIRONMENT")} }
func (g TargetGuard) Validate(raw string) error { u,err:=url.Parse(raw);if err!=nil||u.Hostname()==""||u.User!=nil||u.RawQuery!=""{return ErrUnsafeTarget}; dev:=g.Environment=="development";if u.Scheme!="https" && !(dev&&u.Scheme=="http"){return ErrUnsafeTarget};ips,err:=g.Resolver(u.Hostname());if err!=nil||len(ips)==0{return ErrUnsafeTarget};if !dev {for _,ip:=range ips{if unsafeIP(ip){return ErrUnsafeTarget}}};return nil }
func unsafeIP(ip net.IP) bool { return ip.IsLoopback()||ip.IsPrivate()||ip.IsLinkLocalUnicast()||ip.IsLinkLocalMulticast()||ip.IsUnspecified()||strings.HasPrefix(ip.String(),"169.254.169.254") }
