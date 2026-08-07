package securityscan
import "errors"
type UnavailableRunner struct{ Err error }
func(r UnavailableRunner)Run(ctx Context,plan ScanPlan)(ScanReport,error){if r.Err!=nil{return ScanReport{},r.Err};return ScanReport{},errors.New("scanner runner is unavailable")}
