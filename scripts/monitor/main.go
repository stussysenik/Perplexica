package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"time"
)

type Deployment struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	CreatedAt string `json:"createdAt"`
}

func getDeployments() ([]Deployment, error) {
	cmd := exec.Command("railway", "deployment", "list", "--json")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var deployments []Deployment
	err = json.Unmarshal(output, &deployments)
	if err != nil {
		return nil, err
	}

	return deployments, nil
}

func tailLogs(id string) {
	fmt.Printf("📜 Tailing logs for deployment %s...\n", id)
	cmd := exec.Command("railway", "logs", "--deployment", id)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Run()
}

func main() {
	service := flag.String("service", "", "The Railway service to monitor")
	flag.Parse()

	fmt.Printf("📡 Monitoring Railway deployment for service: %s\n", *service)

	lastID := ""
	lastStatus := ""

	for {
		deployments, err := getDeployments()
		if err != nil {
			fmt.Printf("⚠️  Error fetching deployments: %v\n", err)
			time.Sleep(5 * time.Second)
			continue
		}

		if len(deployments) == 0 {
			fmt.Println("⌛ No deployments found.")
			time.Sleep(10 * time.Second)
			continue
		}

		latest := deployments[0]

		if latest.ID != lastID || latest.Status != lastStatus {
			fmt.Printf("[%s] 🕒 %s -> 🚀 %s\n", time.Now().Format("15:04:05"), latest.ID, latest.Status)
			lastID = latest.ID
			lastStatus = latest.Status

			if latest.Status == "FAILED" || latest.Status == "CRASHED" {
				fmt.Printf("❌ Deployment %s failed.\n", latest.ID)
				tailLogs(latest.ID)
				os.Exit(1)
			}

			if latest.Status == "SUCCESS" {
				fmt.Printf("✅ Deployment %s succeeded!\n", latest.ID)
				os.Exit(0)
			}
		}

		if latest.Status == "BUILDING" || latest.Status == "DEPLOYING" || latest.Status == "INITIALIZING" {
			// Periodically show logs if we're in a waiting state
			tailLogs(latest.ID)
		}

		time.Sleep(15 * time.Second)
	}
}
