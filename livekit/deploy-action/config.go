// Copyright 2025 LiveKit, Inc.
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

package main

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"

	"github.com/BurntSushi/toml"

	"github.com/livekit/protocol/logger"
)

type CLIConfig struct {
	DefaultProject string          `yaml:"default_project"`
	Projects       []ProjectConfig `yaml:"projects"`
	DeviceName     string          `yaml:"device_name"`
	// absent from YAML
	hasPersisted bool
}

type ProjectConfig struct {
	Name      string `yaml:"name"`
	URL       string `yaml:"url"`
	APIKey    string `yaml:"api_key"`
	APISecret string `yaml:"api_secret"`
}

func LoadDefaultProject() (*ProjectConfig, error) {
	conf, err := LoadOrCreate()
	if err != nil {
		return nil, err
	}

	// prefer default project
	if conf.DefaultProject != "" {
		for _, p := range conf.Projects {
			if p.Name == conf.DefaultProject {
				return &p, nil
			}
		}
	}

	return nil, errors.New("no default project set")
}

func ExtractSubdomain(url string) string {
	subdomainPattern := regexp.MustCompile(`^(?:https?|wss?)://([^.]+)\.`)
	matches := subdomainPattern.FindStringSubmatch(url)
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}

func Accented(s string) string {
	return s
}

func LoadProjectBySubdomain(subdomain string) (*ProjectConfig, error) {
	conf, err := LoadOrCreate()
	if err != nil {
		return nil, err
	}

	if subdomain == "" {
		return nil, errors.New("invalid URL")
	}

	for _, p := range conf.Projects {
		projectSubdomain := ExtractSubdomain(p.URL)
		if projectSubdomain == subdomain {
			fmt.Printf("Using project [%s]\n", Accented(p.Name))
			return &p, nil
		}
	}

	return nil, errors.New("project not found")
}

func LoadProject(name string) (*ProjectConfig, error) {
	conf, err := LoadOrCreate()
	if err != nil {
		return nil, err
	}

	for _, p := range conf.Projects {
		if p.Name == name {
			return &p, nil
		}
	}

	return nil, errors.New("project not found")
}

// LoadOrCreate loads config file from ~/.livekit/cli-config.yaml
// if it doesn't exist, it'll return an empty config file
func LoadOrCreate() (*CLIConfig, error) {
	configPath, err := getConfigLocation()
	if err != nil {
		return nil, err
	}

	c := &CLIConfig{}
	if s, err := os.Stat(configPath); os.IsNotExist(err) {
		return c, nil
	} else if err != nil {
		return nil, err
	} else if s.Mode().Perm()&0077 != 0 {
		// because this file contains private keys, warn that
		// only the owner should have permission to access it
		fmt.Fprintf(os.Stderr, "WARNING: config file %s should have permissions %o\n", configPath, 0600)
	}

	content, err := os.ReadFile(configPath)
	if err != nil {
		return nil, err
	}

	err = yaml.Unmarshal(content, c)
	if err != nil {
		return nil, err
	}
	c.hasPersisted = true

	return c, nil
}

func (c *CLIConfig) ProjectExists(name string) bool {
	for _, p := range c.Projects {
		if strings.EqualFold(p.Name, name) {
			return true
		}
	}
	return false
}

func (c *CLIConfig) RemoveProject(name string) error {
	var newProjects []ProjectConfig
	for _, p := range c.Projects {
		if p.Name == name {
			continue
		}
		newProjects = append(newProjects, p)
	}
	c.Projects = newProjects

	if c.DefaultProject == name {
		c.DefaultProject = ""
	}

	if err := c.PersistIfNeeded(); err != nil {
		return err
	}

	fmt.Println("Removed project", name)
	return nil
}

func (c *CLIConfig) PersistIfNeeded() error {
	if len(c.Projects) == 0 && !c.hasPersisted {
		// doesn't need to be persisted
		return nil
	}

	configPath, err := getConfigLocation()
	if err != nil {
		return err
	}
	if err = os.MkdirAll(path.Dir(configPath), 0700); err != nil {
		return err
	}

	data, err := yaml.Marshal(c)
	if err != nil {
		return err
	}

	if err = os.WriteFile(configPath, data, 0600); err != nil {
		return err
	}
	fmt.Println("Saved CLI config to", configPath)
	return nil
}

func getConfigLocation() (string, error) {
	dir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	return path.Join(dir, ".livekit", "cli-config.yaml"), nil
}

const (
	LiveKitTOMLFile = "livekit.toml"
)

var (
	ErrInvalidConfig       = errors.New("invalid configuration file")
	ErrInvalidReplicaCount = fmt.Errorf("replicas cannot be greater than max_replicas: %w", ErrInvalidConfig)
)

// Deprecated: use LiveKitTOML instead
type AgentTOML struct {
	ProjectSubdomain string   `toml:"project_subdomain"`
	Regions          []string `toml:"regions"`
}

type LiveKitTOML struct {
	Project *LiveKitTOMLProjectConfig `toml:"project"` // Required
	Agent   *LiveKitTOMLAgentConfig   `toml:"agent"`
}

type LiveKitTOMLProjectConfig struct {
	Subdomain string `toml:"subdomain"`
}

type LiveKitTOMLAgentConfig struct {
	ID      string   `toml:"id"`
	Regions []string `toml:"regions"`
}

func NewLiveKitTOML(forSubdomain string) *LiveKitTOML {
	forSubdomain = strings.TrimPrefix(forSubdomain, "https://")
	forSubdomain = strings.TrimPrefix(forSubdomain, "wss://")

	return &LiveKitTOML{
		Project: &LiveKitTOMLProjectConfig{
			Subdomain: forSubdomain,
		},
	}
}

func (c *LiveKitTOML) WithDefaultAgent() *LiveKitTOML {
	c.Agent = &LiveKitTOMLAgentConfig{}
	return c
}

func (c *LiveKitTOML) HasAgent() bool {
	return c.Agent != nil
}

func (c *LiveKitTOML) SaveTOMLFile(dir string, tomlFileName string) error {
	f, err := os.Create(filepath.Join(dir, tomlFileName))
	if err != nil {
		return err
	}
	defer f.Close()
	encoder := toml.NewEncoder(f)
	if err := encoder.Encode(c); err != nil {
		return fmt.Errorf("error encoding TOML: %w", err)
	}
	fmt.Printf("Saving config file [%s]\n", Accented(tomlFileName))
	return nil
}

func LoadTOMLFile(dir string, tomlFileName string) (*LiveKitTOML, bool, error) {
	logger.Debugw(fmt.Sprintf("loading %s file", tomlFileName))
	var config *LiveKitTOML = nil
	var err error
	var configExists bool = false

	tomlFile := filepath.Join(dir, tomlFileName)

	if _, err = os.Stat(tomlFile); err == nil {
		configExists = true

		_, err = toml.DecodeFile(tomlFile, &config)
		if config.Project == nil {
			// Attempt to decode old agent config
			var oldConfig AgentTOML
			_, err = toml.DecodeFile(tomlFile, &oldConfig)
			if err != nil {
				return nil, configExists, err
			}
			config.Project = &LiveKitTOMLProjectConfig{
				Subdomain: oldConfig.ProjectSubdomain,
			}
			config.Agent = &LiveKitTOMLAgentConfig{}
		}
	} else {
		configExists = !errors.Is(err, fs.ErrNotExist)
	}

	return config, configExists, err
}
