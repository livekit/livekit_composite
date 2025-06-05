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

package hwstats

import (
	"fmt"
	"os"
	"sync"
	"time"
)

type platformCPUMonitor interface {
	getCPUIdle() (float64, error)
	numCPU() float64
}

type CPUStats struct {
	mu       sync.RWMutex
	idleCPUs float64
	platform platformCPUMonitor

	closeChan chan struct{}
}

func NewCPUStats() (*CPUStats, error) {
	p, err := newPlatformCPUMonitor()
	if err != nil {
		return nil, err
	}

	c := &CPUStats{
		platform:  p,
		closeChan: make(chan struct{}),
	}

	go c.monitorCPULoad()

	return c, nil
}

func (c *CPUStats) GetCPUIdle() float64 {
	c.mu.RLock()
	defer c.mu.RUnlock()

	return c.idleCPUs
}

func (c *CPUStats) NumCPU() float64 {
	return c.platform.numCPU()
}

func (c *CPUStats) Stop() {
	close(c.closeChan)
}

func (c *CPUStats) monitorCPULoad() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-c.closeChan:
			return
		case <-ticker.C:
			idle, err := c.platform.getCPUIdle()
			if err != nil {
				os.Stderr.WriteString(fmt.Sprintf("failed retrieving CPU idle: %v\n", err))
				continue
			}

			c.mu.Lock()
			c.idleCPUs = idle
			c.mu.Unlock()
		}
	}
}
