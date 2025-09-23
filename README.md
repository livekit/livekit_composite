# LiveKit Knowledge Base for LLM Assistant

[LiveKit Docs](https://docs.livekit.io/)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/livekit/livekit_composite)
[![Slack community](https://img.shields.io/endpoint?url=https%3A%2F%2Flivekit.io%2Fbadges%2Fslack)](https://livekit.io/join-slack)
[![Twitter Follow](https://img.shields.io/twitter/follow/livekit)](https://twitter.com/livekit)


## Overview

This project contains a comprehensive knowledge base about LiveKit, a real-time communication platform. The data is specifically organized and formatted for use by Large Language Model (LLM) assistants to provide accurate, up-to-date information about LiveKit products, services, and troubleshooting.

## Data Sources

### 1. LiveKit Knowledge Base (`knowledge_base/` directory)
- **Source**: Official LiveKit Knowledge Base (https://kb.livekit.io)
- **Content**: 17+ articles covering pricing, agents, troubleshooting, and best practices
- **Format**: Well-formatted Markdown files with proper headings, lists, and links
- **Update script**: `python pull_kb.py`
- **Update frequency**: Run weekly or before important projects

### 2. LiveKit Codebase (`livekit/` directories)
- **Source**: Multiple LiveKit GitHub repositories (livekit org)
- **Content**: Complete source code for the LiveKit ecosystem
- **Coverage**: Core platform, agents, SDKs, ingress/egress, SIP integration, and more
- **Update script**: `python sync_livekit_repos.py`
- **Update frequency**: Updated repositories from past 365 days, excludes archived repos

### 3. LiveKit Examples (`livekit-examples/` directories)
- **Source**: Multiple LiveKit GitHub repositories (livekit-examples org)
- **Content**: Complete source code for the LiveKit examples
- **Coverage**: Examples that demonstrate the usage of `livekit/`
- **Update script**: `python sync_livekit_repos.py`
- **Update frequency**: Updated repositories from past 365 days, excludes archived repos

### 4. LiveKit Documentation (`doc/` directory)
- **Source**: Official LiveKit documentation (https://docs.livekit.io/llms-full.txt)
- **Content**: Complete LLM-optimized documentation
- **Format**: Plain text format optimized for language models
- **Update script**: `python sync_livekit_repos.py` (included in repo sync)

### 5. **CRITICAL: LLM Guidance** (`knowledge_guidance.md`)
- **Source**: Curated clarifications and corrections for common misunderstandings
- **Purpose**: Prevents misleading or incorrect responses about LiveKit
- **Content**: Specific guidance on issues that have caused confusion in the past
- **Priority**: **ALWAYS CHECK THIS FILE FIRST** before responding to technical questions
- **Examples**: Clarifications about warnings, error messages, and common misconceptions

## How to Use This Data as an LLM Assistant

### When Answering LiveKit Questions

1. **🚨 FIRST: Check the guidance file** (`knowledge_guidance.md`)
   - Contains critical clarifications for common misunderstandings
   - Prevents giving misleading or incorrect information
   - Includes specific guidance on warnings, errors, and misconceptions
   - **Always review this file before responding to technical questions**

2. **Check the knowledge base** (`knowledge_base/` directory)
   - These are official, curated answers to common questions
   - Content is specifically written for user support
   - Includes pricing information, troubleshooting steps, and best practices

3. **Reference specific articles when relevant**
   - Example: "According to the LiveKit knowledge base article on pricing..."
   - Provide direct quotes from the markdown files when helpful
   - Link to specific sections using the heading structure

4. **Use codebase for technical implementation details**
   - Reference actual code examples from the `livekit/` and `livekit-examples/` directories
   - Show real API usage patterns from working examples
   - Provide accurate method signatures and parameters

5. **Leverage documentation for comprehensive information**
   - The `doc/full-llm.txt` contains complete LiveKit documentation
   - Use for detailed explanations of concepts and APIs
   - Cross-reference with code examples for complete answers

### Key Knowledge Base Topics

- **Pricing and billing** (`understanding_livekit_cloud_pricing.md`)
- **Agent development** (multiple agent-related files)
- **SIP integration** (`creating_sip_inbound_trunks_and_dispatch_rules_with_python_s.md`)
- **Troubleshooting** (error handling and debugging articles)
- **Best practices** (etiquette, deployment, and optimization)

### Code Examples and Implementation

- **Python SDK**: `livekit/livekit/` and `livekit/agents/`
- **JavaScript SDK**: Various client-side implementations
- **Go services**: Core server implementations
- **SIP integration**: `livekit/sip/` and `livekit/sipgo/`
- **Media processing**: `livekit/ingress/` and `livekit/egress/`

## Response Guidelines

### Do:
- 🚨 **ALWAYS check `knowledge_guidance.md` first** for known clarifications and corrections
- ✅ Quote directly from knowledge base articles when available
- ✅ Provide specific file references for code examples
- ✅ Reference working examples from `livekit-examples/` when showing implementation
- ✅ Mention when information comes from official LiveKit documentation
- ✅ Reference pricing details from the official pricing article
- ✅ Suggest checking the knowledge base for the most current information
- ✅ If a topic is covered in the guidance file, follow those specific instructions

### Don't:
- ❌ **Ignore the guidance file** - it contains corrections for common mistakes
- ❌ Make up pricing information - always reference the official pricing article
- ❌ Provide outdated troubleshooting steps - use the current knowledge base
- ❌ Guess at API methods - reference the actual codebase
- ❌ Provide unofficial workarounds without noting they're not from LiveKit docs
- ❌ Give responses about warnings/errors without checking if they're addressed in guidance

## Data Freshness

- Knowledge base articles are scraped from the official LiveKit KB
- Run the update script regularly to ensure current information
- Codebase represents snapshots of LiveKit repositories
- When in doubt about currency, recommend checking the official LiveKit documentation

## Example Usage Pattern

When a user asks: "How much does LiveKit Cloud cost?"

1. Reference: `knowledge_base/understanding_livekit_cloud_pricing.md`
2. Provide: Direct quotes about pricing components
3. Include: Link to official pricing page mentioned in the article
4. Note: Information is from the official LiveKit knowledge base

## Getting Help

For the most current information, users should:
- Check the official LiveKit documentation: https://docs.livekit.io
- Join the LiveKit community Slack (see knowledge base for link)
- Review the GitHub repositories for latest code examples

This knowledge base provides a solid foundation, but always encourage users to verify with official sources for production deployments. 
