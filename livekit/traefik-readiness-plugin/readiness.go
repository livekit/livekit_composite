// Copyright 2023 LiveKit, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package traefik_readiness_plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/livekit/traefik-readiness-plugin/hwstats"
)

// Config the plugin configuration.
type Config struct {
	DryRun bool `json:"dry_run,omitempty"`

	ReadyPath     string  `json:"ready_path,omitempty"`
	ReadyCPULimit float64 `json:"ready_cpu_limit,omitempty"`

	EnableRawDataPoller   bool   `json:"enable_raw_data_poller,omitempty"`
	TraefikAPIPort        int    `json:"traefik_api_port,omitempty"`
	TraefikAPIRawdataPath string `json:"traefik_api_rawdata_path,omitempty"`
}

// CreateConfig creates the default plugin configuration.
func CreateConfig() *Config {
	return &Config{
		DryRun: false,

		ReadyPath:     "/ready",
		ReadyCPULimit: 0.8,

		EnableRawDataPoller:   false,
		TraefikAPIPort:        9000,
		TraefikAPIRawdataPath: "/api/rawdata",
	}
}

type Readiness struct {
	next     http.Handler
	name     string
	cpuStats *hwstats.CPUStats

	dryRun            bool
	readyPath         string
	readyCPULimit     float64
	rawdataHasSettled bool
}

func New(ctx context.Context, next http.Handler, config *Config, name string) (http.Handler, error) {
	cpuStats, err := hwstats.NewCPUStats()
	if err != nil {
		return nil, err
	}

	r := &Readiness{
		next:     next,
		name:     name,
		cpuStats: cpuStats,

		dryRun:        config.DryRun,
		readyPath:     config.ReadyPath,
		readyCPULimit: config.ReadyCPULimit,
	}

	if config.EnableRawDataPoller {
		go r.rawdataPoller(config.TraefikAPIPort, config.TraefikAPIRawdataPath)
	} else {
		r.rawdataHasSettled = true
	}

	return r, nil
}

func (p *Readiness) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	if req.URL.Path != p.readyPath {
		p.next.ServeHTTP(rw, req)
		return
	}

	os.Stdout.WriteString(fmt.Sprintf("readiness plugin recieved request: %v\n", req.URL.Path))

	var cpuLoad float64
	cpuIdle := p.cpuStats.GetCPUIdle()
	if cpuIdle > 0 {
		cpuLoad = 1 - (cpuIdle / p.cpuStats.NumCPU())
	}

	var httpStatus int
	var message string
	if cpuLoad > p.readyCPULimit {
		httpStatus = http.StatusNotAcceptable
		message = "Not ready: CPU Limit reached"
	} else if !p.rawdataHasSettled {
		httpStatus = http.StatusNotAcceptable
		message = "Not ready: Traefik raw data has not yet settled"
	} else {
		httpStatus = http.StatusOK
		message = "Ready"
	}

	if httpStatus != http.StatusOK {
		os.Stderr.WriteString(fmt.Sprintf("readiness plugin not ok (%v): %s\n", httpStatus, message))
		os.Stderr.WriteString(fmt.Sprintf("readiness plugin cpus: %v, cpu load: %v / %v\n", p.cpuStats.NumCPU(), cpuLoad, p.readyCPULimit))

		if p.dryRun {
			httpStatus = http.StatusOK
		}
	}

	rw.WriteHeader(httpStatus)
	rw.Write([]byte(message))
	rw.Write([]byte("\n\n"))
	rw.Write([]byte(fmt.Sprintf("Num CPUs: %v\n", p.cpuStats.NumCPU())))
	rw.Write([]byte(fmt.Sprintf("CPU Load: %v / %v\n", cpuLoad, p.readyCPULimit)))
}

func (p *Readiness) rawdataPoller(apiPort int, apiRawdataPath string) {
	ticker := time.NewTicker(1 * time.Second)
	defer func() {
		p.rawdataHasSettled = true // benign race condition here is ok
		ticker.Stop()
	}()

	var lastElementCount int
	for {
		select {
		case <-ticker.C:
			resp, err := http.Get(fmt.Sprintf("http://localhost:%v%v", apiPort, apiRawdataPath))
			if err != nil {
				os.Stderr.WriteString(fmt.Sprintf("error getting data from traefik api: %v\n", err))
				return
			}
			rawDataElements := make(map[string]map[string]json.RawMessage)
			if err := json.NewDecoder(resp.Body).Decode(&rawDataElements); err != nil {
				os.Stderr.WriteString(fmt.Sprintf("error decoding traefik api response: %v\n", err))
				resp.Body.Close()
				return
			}
			resp.Body.Close()

			var elementCount int
			for _, v := range rawDataElements {
				elementCount += len(v)
			}
			if elementCount == lastElementCount {
				// data has settled
				return
			}
			lastElementCount = elementCount
		}
	}
}
