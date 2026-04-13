# Spec: Railway Deployment Fix & Verification

## Objective
Fix the current 404 Not Found on the Railway production URL by triggering a successful build and deployment. Since the standard Railway CLI logs are often empty during the build/deploy transition, we will build a custom monitor that tracks the deployment lifecycle and tails logs specifically for the active build.

## Tech Stack
- **Deployment:** Railway CLI (v4.33.0)
- **Runtime:** Docker (Multi-stage)
- **Verification & Monitoring:** Go (v1.25.5)

## Commands
- **Deploy:** `railway up --detach`
- **Monitor Build:** `go run ./scripts/monitor/main.go --service perplexica`
- **Verify Final:** `go run ./scripts/verify/main.go --url https://perplexica-production-41f5.up.railway.app`

## Project Structure
- `scripts/verify/main.go` → Black-box feature verification.
- `scripts/monitor/main.go` → (New) Railway lifecycle and log tailer.

## Monitor Tool Design (Go)
The tool will:
1. Execute `railway deployment list --json` to identify the newest deployment.
2. Report the status (BUILDING, DEPLOYING, SUCCESS, FAILED).
3. Automatically switch to tailing logs (`railway logs --deployment <id>`) once a deployment starts.
4. Exit with 0 on SUCCESS, 1 on FAILED.

## Success Criteria
- [ ] `railway up` triggers a build.
- [ ] `monitor-tool` provides real-time feedback on build/deploy status.
- [ ] `verify-tool` confirms the chess feature is live.
