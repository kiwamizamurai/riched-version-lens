[![Version](https://img.shields.io/visual-studio-marketplace/v/kiwamizamurai-vscode.riched-version-lens)](https://marketplace.visualstudio.com/items?itemName=kiwamizamurai-vscode.riched-version-lens)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/kiwamizamurai-vscode.riched-version-lens)](https://marketplace.visualstudio.com/items?itemName=kiwamizamurai-vscode.riched-version-lens)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/kiwamizamurai-vscode.riched-version-lens)](https://marketplace.visualstudio.com/items?itemName=kiwamizamurai-vscode.riched-version-lens)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/kiwamizamurai-vscode.riched-version-lens)](https://marketplace.visualstudio.com/items?itemName=kiwamizamurai-vscode.riched-version-lens)
[![License](https://img.shields.io/github/license/kiwamizamurai/riched-version-lens)](https://github.com/kiwamizamurai/riched-version-lens/blob/main/LICENSE)


# Riched Version Lens with Changelog

A VSCode extension that displays version status indicators (✅/🆙) for your project dependencies, with detailed changelog previews on hover.

## Features

- 🔍 **Version Status Indicators**
  - ✅ Up-to-date dependencies
  - 🆙 Updates available

- 📝 **Changelog Preview**
  - View package changelogs directly in hover tooltips
  - See what's new before updating
  - Supports multiple changelog sources:
    - GitHub Releases
    - CHANGELOG.md files
    - Package registry metadata

- 📦 **Supported Package Managers**
  - npm (package.json)
  - Python (requirements.txt, pyproject.toml)
  - Ruby (Gemfile)

## Usage

1. Open any supported dependency file
2. Look for the version indicators:
   - ✅ indicates your dependency is up to date
   - 🆙 shows an update is available
3. Hover over any dependency to see its changelog

## Supported Package Managers

| Status | Description |
|--------|-------------|
| ✅ | Fully Supported |
| 🚧 | In Development |

### Active Support
| Language | File | Status |
|----------|------|--------|
| Python | `requirements.txt`, `pyproject.toml` | ✅ |
| Node.js | `package.json` | ✅ |
| Ruby | `Gemfile` | ✅ |

### Coming Soon
| Language | File | Status |
|----------|------|--------|
| PHP | `composer.json` | 🚧 |
| Java | `pom.xml`, `build.gradle` | 🚧 |
| Swift | `Package.swift` | 🚧 |
| Kotlin | `build.gradle.kts` | 🚧 |
| Dart | `pubspec.yaml` | 🚧 |
| Terraform | `*.tf` | 🚧 |
| Ansible | `requirements.yml` | 🚧 |
| Helm | `Chart.yaml` | 🚧 |

## Quick Start

1. **Install**
   ```
   ext install riched-version-lens
   ```

2. **Use**
   - Open any supported dependency file
   - Look for indicators:
     - ✅ Up-to-date
     - 🆙 Update available

## Configuration

```json
{
   "riched-version-lens.logging.level": "info",
   "riched-version-lens.logging.enabled": true,
   "riched-version-lens.logging.showOnStartup": true,
   "riched-version-lens.logging.logToFile": false,
   "riched-version-lens.logging.logFilePath": "",
   "riched-version-lens.logging.maxFileSize": 5242880,
   "riched-version-lens.enableChangelogCache": true
}
```

## Contributing

See our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT - See [LICENSE](LICENSE) file

## Similar Projects

- [Version Lens](https://marketplace.visualstudio.com/items?itemName=pflannery.vscode-versionlens)
