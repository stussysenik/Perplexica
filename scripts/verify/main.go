package main

import (
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {
	url := flag.String("url", "", "The URL to verify")
	timeout := flag.Duration("timeout", 5*time.Minute, "Total timeout for verification")
	flag.Parse()

	if *url == "" {
		fmt.Println("Error: --url is required")
		os.Exit(1)
	}

	healthURL := fmt.Sprintf("%s/health", strings.TrimSuffix(*url, "/"))
	rootURL := *url

	start := time.Now()
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	fmt.Printf("🚀 Starting verification for %s\n", rootURL)
	fmt.Printf("⏱️  Timeout set to %v\n", *timeout)

	for {
		select {
		case <-time.After(*timeout):
			fmt.Printf("\n❌ TIMEOUT reached after %v. Deployment failed or is taking too long.\n", time.Since(start))
			os.Exit(1)
		case t := <-ticker.C:
			elapsed := t.Sub(start).Round(time.Second)
			fmt.Printf("[%s] 🔍 Checking health at %s...\n", elapsed, healthURL)

			resp, err := http.Get(healthURL)
			if err != nil {
				fmt.Printf("   ⚠️  Connection error: %v\n", err)
				continue
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				fmt.Printf("   ⌛ Service not ready yet (Status: %d)\n", resp.StatusCode)
				continue
			}

			fmt.Printf("   ✅ Health check passed (200 OK)!\n")
			fmt.Printf("[%s] ♟️  Checking for Chess feature at %s...\n", elapsed, rootURL)

			respRoot, err := http.Get(rootURL)
			if err != nil {
				fmt.Printf("   ⚠️  Connection error on root: %v\n", err)
				continue
			}
			defer respRoot.Body.Close()

			body, _ := io.ReadAll(respRoot.Body)
			content := string(body)

			hasFeature := strings.Contains(content, "A Set of Chess Pieces")
			hasSymbols := strings.Contains(content, "♔") || strings.Contains(content, "♚")

			if hasFeature && hasSymbols {
				fmt.Printf("\n🏆 SUCCESS! Feature is LIVE and verified!\n")
				fmt.Printf("   - 'A Set of Chess Pieces' found.\n")
				fmt.Printf("   - Chess symbols (♔/♚) found.\n")
				fmt.Printf("   - Total time: %v\n", time.Since(start).Round(time.Second))
				os.Exit(0)
			} else if strings.Contains(content, "Perplexica") {
				fmt.Printf("   ⌛ Base site is up, but Chess feature is not yet visible.\n")
			} else {
				fmt.Printf("   ⌛ Page reachable, but unexpected content (waiting for deployment to swap).\n")
			}
		}
	}
}
