# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.18] - 2026-08-11

### Added

- Two-way language mapping from either a font card or a language card.
- Selectable font cards with mapped-language tabs and synchronized language-card highlighting.
- Support for highlighting primary and fallback font cards together when both are mapped to a language.
- Per-language primary brand font size adjustment independent of fallback font sizing.

### Changed

- Language-specific font settings now inherit global values until explicitly overridden.
- Language-level values take precedence over global font settings.
- Resetting language styling preserves its font mapping.
- Unmapping a language-only font promotes it to the global fallback list instead of deleting it.

### Fixed

- Font-first and language-first mapping now produce the same language-specific override structure.
- Removing one font mapping no longer removes other mappings assigned to the same language.

## [0.1.0] - 2026-01-11

### Added
- Initial project release.
- **SEO Overhaul**: Enhanced search engine optimization including metadata and structured data.
- **Font Override Fixes**: Resolved issues with font overriding logic.
- **Metrics Accuracy**: Improved alignment of metric guides with rendered text.
